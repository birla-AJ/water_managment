import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Grid, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import PolylineIcon from '@mui/icons-material/Polyline';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/PageHeader';
import { adminApi, trackingApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import { useAppSelector } from '../app/hooks';
import type { Admin, LiveTrackingDriver, ServiceAreaPolygon } from '../types';

const DEFAULT_CENTER: [number, number] = [22.7196, 75.8577]; // Indore fallback

declare global {
  interface Window {
    L?: any;
  }
}

function loadLeaflet(): Promise<any> {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const jsId = 'leaflet-js';
    const existing = document.getElementById(jsId) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = jsId;
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function polygonLatLngs(polygon: ServiceAreaPolygon): [number, number][] {
  return (polygon.geoJson.coordinates[0] ?? []).map(([lng, lat]) => [lat, lng]);
}

function statusColor(driver: LiveTrackingDriver) {
  if (!driver.isOnDuty) return 'default';
  if (!driver.latestLocation) return 'warning';
  return driver.isLocationFresh ? 'success' : 'warning';
}

export default function LiveTracking() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const drawLayerRef = useRef<any>(null);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [polygonName, setPolygonName] = useState('');
  const [polygonColor, setPolygonColor] = useState('#0E8C84');
  const [polygonAdminId, setPolygonAdminId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ServiceAreaPolygon | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['live-tracking'],
    queryFn: trackingApi.live,
    refetchInterval: 15_000,
  });

  const { data: adminsResponse } = useQuery({
    queryKey: ['admins-for-polygons'],
    queryFn: () => adminApi.list({ page: 1, limit: 100 }),
    enabled: isSuperAdmin,
  });

  const admins = useMemo(() => {
    const raw = adminsResponse?.data as unknown;
    return Array.isArray(raw) ? (raw as Admin[]).filter((a) => a.role === 'ADMIN') : [];
  }, [adminsResponse]);

  const createPolygon = useMutation({
    mutationFn: () => {
      if (draftPoints.length < 3) throw new Error('Draw at least 3 points');
      if (!polygonName.trim()) throw new Error('Enter polygon name');
      if (isSuperAdmin && !polygonAdminId) throw new Error('Select distributor');
      const closed = [...draftPoints, draftPoints[0]];
      return trackingApi.createPolygon({
        adminId: isSuperAdmin ? polygonAdminId : undefined,
        name: polygonName.trim(),
        color: polygonColor,
        geoJson: {
          type: 'Polygon',
          coordinates: [closed.map(([lat, lng]) => [lng, lat])],
        },
      });
    },
    onSuccess: () => {
      enqueueSnackbar('Service area polygon saved', { variant: 'success' });
      setDraftPoints([]);
      setDrawMode(false);
      setPolygonName('');
      qc.invalidateQueries({ queryKey: ['live-tracking'] });
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const removePolygon = useMutation({
    mutationFn: (id: string) => trackingApi.removePolygon(id),
    onSuccess: () => {
      enqueueSnackbar('Service polygon deleted', { variant: 'success' });
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['live-tracking'] });
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  useEffect(() => {
    let mounted = true;
    loadLeaflet()
      .then((L) => {
        if (!mounted || !mapEl.current || mapRef.current) return;
        const map = L.map(mapEl.current, { zoomControl: true }).setView(DEFAULT_CENTER, 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
        mapRef.current = map;
        layerRef.current = L.layerGroup().addTo(map);
        drawLayerRef.current = L.layerGroup().addTo(map);
        setLeafletReady(true);
      })
      .catch(() => enqueueSnackbar('Could not load free map provider', { variant: 'error' }));
    return () => { mounted = false; };
  }, [enqueueSnackbar]);

  useEffect(() => {
    if (!leafletReady || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = mapRef.current;
    const onClick = (event: any) => {
      if (!drawMode) return;
      setDraftPoints((pts) => [...pts, [event.latlng.lat, event.latlng.lng]]);
    };
    map.on('click', onClick);
    return () => map.off('click', onClick);
  }, [drawMode, leafletReady]);

  useEffect(() => {
    if (!leafletReady || !window.L || !layerRef.current || !data) return;
    const L = window.L;
    const layers = layerRef.current;
    layers.clearLayers();
    const bounds: any[] = [];

    data.polygons.forEach((polygon) => {
      const latLngs = polygonLatLngs(polygon);
      if (latLngs.length < 3) return;
      L.polygon(latLngs, {
        color: polygon.color,
        fillColor: polygon.color,
        fillOpacity: 0.12,
        weight: 2,
      })
        .bindPopup(`<b>${polygon.name}</b><br/>${polygon.admin?.name ?? 'Distributor'}`)
        .addTo(layers);
      bounds.push(...latLngs);
    });

    data.drivers.forEach((driver) => {
      const loc = driver.latestLocation;
      if (!loc) return;
      const color = driver.isOnDuty && driver.isLocationFresh ? '#179A33' : '#CA8A04';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,.35)"></div>`,
        iconSize: [22, 22],
      });
      const marker = L.marker([loc.latitude, loc.longitude], { icon }).addTo(layers);
      marker.bindPopup(`
        <b>${driver.name}</b><br/>
        ${driver.vehicle?.number ?? 'No vehicle'}<br/>
        ${driver.isOnDuty ? 'On duty' : 'Off duty'}<br/>
        Last ping: ${dayjs(loc.recordedAt).format('HH:mm:ss')}
      `);
      bounds.push([loc.latitude, loc.longitude]);

      driver.activeDeliveries.forEach((delivery) => {
        const c = delivery.customer;
        if (c.latitude == null || c.longitude == null) return;
        const cMarker = L.circleMarker([c.latitude, c.longitude], {
          radius: 7,
          color: '#055152',
          fillColor: '#DABD71',
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(layers);
        cMarker.bindPopup(`<b>${c.name}</b><br/>${delivery.order.orderNumber}<br/>${c.area ?? ''}`);
        L.polyline([[loc.latitude, loc.longitude], [c.latitude, c.longitude]], {
          color: '#055152',
          dashArray: '6,8',
          weight: 2,
        }).addTo(layers);
        bounds.push([c.latitude, c.longitude]);
      });
    });

    if (bounds.length) mapRef.current.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
  }, [data, leafletReady]);

  useEffect(() => {
    if (!leafletReady || !window.L || !drawLayerRef.current) return;
    const L = window.L;
    const layer = drawLayerRef.current;
    layer.clearLayers();
    draftPoints.forEach((pt, index) => {
      L.circleMarker(pt, { radius: 6, color: '#D32F2F', fillOpacity: 0.9 }).bindTooltip(String(index + 1)).addTo(layer);
    });
    if (draftPoints.length >= 2) L.polyline(draftPoints, { color: '#D32F2F', weight: 3 }).addTo(layer);
    if (draftPoints.length >= 3) L.polygon(draftPoints, { color: '#D32F2F', fillOpacity: 0.08 }).addTo(layer);
  }, [draftPoints, leafletReady]);

  const onDuty = data?.drivers.filter((d) => d.isOnDuty).length ?? 0;
  const fresh = data?.drivers.filter((d) => d.isLocationFresh).length ?? 0;
  const activeDeliveries = data?.drivers.reduce((sum, d) => sum + d.activeDeliveries.length, 0) ?? 0;

  return (
    <Box>
      <PageHeader
        title="Live Tracking"
        subtitle="Track on-duty drivers, active deliveries, and distributor service polygons"
        action={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} onClick={() => refetch()} disabled={isLoading}>Refresh</Button>
            <Button
              variant={drawMode ? 'outlined' : 'contained'}
              startIcon={<PolylineIcon />}
              onClick={() => setDrawMode((v) => !v)}
            >
              {drawMode ? 'Stop Drawing' : 'Draw Polygon'}
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8.2}>
          <Card sx={{ p: 1.5 }}>
            <Box ref={mapEl} sx={{ height: { xs: 460, md: 660 }, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }} />
          </Card>
        </Grid>

        <Grid item xs={12} md={3.8}>
          <Stack spacing={2}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight={800}>Today</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                <Chip label={`${onDuty} on duty`} color="success" />
                <Chip label={`${fresh} live`} color="info" />
                <Chip label={`${activeDeliveries} active deliveries`} />
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                Driver app sends location every 15 seconds while duty is ON.
              </Typography>
            </Card>

            {drawMode && (
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={800}>New Service Polygon</Typography>
                <Typography variant="caption" color="text.secondary">Click the map to add boundary points.</Typography>
                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                  {isSuperAdmin && (
                    <TextField
                      select
                      size="small"
                      label="Distributor"
                      value={polygonAdminId}
                      onChange={(e) => setPolygonAdminId(e.target.value)}
                    >
                      {admins.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                    </TextField>
                  )}
                  <TextField size="small" label="Polygon name" value={polygonName} onChange={(e) => setPolygonName(e.target.value)} />
                  <TextField size="small" label="Color" value={polygonColor} onChange={(e) => setPolygonColor(e.target.value)} />
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => setDraftPoints([])}>Clear</Button>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={() => createPolygon.mutate()} disabled={createPolygon.isPending || draftPoints.length < 3}>
                      Save
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{draftPoints.length} point(s) selected</Typography>
                </Stack>
              </Card>
            )}

            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={800}>Drivers</Typography>
              <Stack spacing={1.25} sx={{ mt: 1.5, maxHeight: 320, overflow: 'auto', pr: 0.5 }}>
                {(data?.drivers ?? []).map((driver) => (
                  <Box key={driver.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.25, bgcolor: 'background.paper' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight={800}>{driver.name}</Typography>
                      <Chip size="small" label={driver.isOnDuty ? 'On duty' : 'Off'} color={statusColor(driver) as any} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">{driver.vehicle?.number ?? 'No vehicle'} - {driver.zone ?? 'No zone'}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {driver.latestLocation ? `Last ping ${dayjs(driver.latestLocation.recordedAt).format('HH:mm:ss')}` : 'No location yet'}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {driver.activeDeliveries.length} active delivery stop(s)
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Card>

            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={800}>Service Polygons</Typography>
              <Stack spacing={1} sx={{ mt: 1.25, maxHeight: 250, overflow: 'auto' }}>
                {(data?.polygons ?? []).map((polygon) => (
                  <Stack key={polygon.id} direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{polygon.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{polygon.admin?.name}</Typography>
                    </Box>
                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteTarget(polygon)}>Delete</Button>
                  </Stack>
                ))}
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 2 }}>
        Free map mode uses OpenStreetMap tiles. For precise road ETA later, plug in Google Maps, Mapbox, or OSRM routing.
      </Alert>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Service Polygon?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This removes the boundary "{deleteTarget?.name}" from the live map.</Typography>
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => deleteTarget && removePolygon.mutate(deleteTarget.id)} disabled={removePolygon.isPending}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
