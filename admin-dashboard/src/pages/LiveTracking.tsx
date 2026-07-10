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

const DEFAULT_CENTER = { lat: 22.7196, lng: 75.8577 };
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? 'AIzaSyBqtNNRlrJDPr392gapSx7VPk3BkTVjDrM';

declare global {
  interface Window {
    google?: any;
    __wfGoogleMapsReady?: () => void;
  }
}

function loadGoogleMaps(): Promise<any> {
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('google-maps-js') as HTMLScriptElement | null;
    window.__wfGoogleMapsReady = () => resolve(window.google);
    if (existing) return;
    const script = document.createElement('script');
    script.id = 'google-maps-js';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}&libraries=drawing,geometry&callback=__wfGoogleMapsReady`;
    script.async = true;
    script.defer = true;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function polygonPath(polygon: ServiceAreaPolygon) {
  return (polygon.geoJson.coordinates[0] ?? []).map(([lng, lat]) => ({ lat, lng }));
}

function statusColor(driver: LiveTrackingDriver) {
  if (!driver.isOnDuty) return 'default';
  if (!driver.latestLocation) return 'warning';
  return driver.isLocationFresh ? 'success' : 'warning';
}

function markerSvg(color: string, label = '') {
  const text = label ? `<text x="16" y="21" text-anchor="middle" font-size="13" font-weight="800" fill="white">${label}</text>` : '';
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="13" fill="${color}" stroke="white" stroke-width="4"/>
      ${text}
    </svg>
  `)}`;
}

export default function LiveTracking() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const drawingRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const draftOverlayRef = useRef<any>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [draftPath, setDraftPath] = useState<Array<{ lat: number; lng: number }>>([]);
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
      if (draftPath.length < 3) throw new Error('Draw a polygon first');
      if (!polygonName.trim()) throw new Error('Enter polygon name');
      if (isSuperAdmin && !polygonAdminId) throw new Error('Select distributor');
      const closed = [...draftPath, draftPath[0]];
      return trackingApi.createPolygon({
        adminId: isSuperAdmin ? polygonAdminId : undefined,
        name: polygonName.trim(),
        color: polygonColor,
        geoJson: {
          type: 'Polygon',
          coordinates: [closed.map((p) => [p.lng, p.lat])],
        },
      });
    },
    onSuccess: () => {
      enqueueSnackbar('Service area polygon saved', { variant: 'success' });
      setDraftPath([]);
      setDrawMode(false);
      setPolygonName('');
      draftOverlayRef.current?.setMap(null);
      draftOverlayRef.current = null;
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
    loadGoogleMaps()
      .then((google) => {
        if (!mounted || !mapEl.current || mapRef.current) return;
        mapRef.current = new google.maps.Map(mapEl.current, {
          center: DEFAULT_CENTER,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });
        drawingRef.current = new google.maps.drawing.DrawingManager({
          drawingMode: null,
          drawingControl: false,
          polygonOptions: {
            fillColor: polygonColor,
            fillOpacity: 0.16,
            strokeColor: polygonColor,
            strokeWeight: 3,
            clickable: true,
            editable: true,
            zIndex: 10,
          },
        });
        drawingRef.current.setMap(mapRef.current);
        google.maps.event.addListener(drawingRef.current, 'polygoncomplete', (poly: any) => {
          draftOverlayRef.current?.setMap(null);
          draftOverlayRef.current = poly;
          const path = poly.getPath().getArray().map((p: any) => ({ lat: p.lat(), lng: p.lng() }));
          setDraftPath(path);
          drawingRef.current.setDrawingMode(null);
        });
        setMapsReady(true);
      })
      .catch(() => enqueueSnackbar('Could not load Google Maps', { variant: 'error' }));
    return () => { mounted = false; };
  }, [enqueueSnackbar, polygonColor]);

  useEffect(() => {
    if (!mapsReady || !window.google?.maps || !drawingRef.current) return;
    drawingRef.current.setDrawingMode(drawMode ? window.google.maps.drawing.OverlayType.POLYGON : null);
  }, [drawMode, mapsReady]);

  useEffect(() => {
    if (!draftOverlayRef.current) return;
    draftOverlayRef.current.setOptions({ fillColor: polygonColor, strokeColor: polygonColor });
  }, [polygonColor]);

  useEffect(() => {
    if (!mapsReady || !window.google?.maps || !mapRef.current || !data) return;
    const google = window.google;
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];
    const bounds = new google.maps.LatLngBounds();
    let hasBounds = false;

    const addInfo = (overlay: any, html: string) => {
      const info = new google.maps.InfoWindow({ content: html });
      overlay.addListener('click', () => info.open({ anchor: overlay, map: mapRef.current }));
    };

    data.polygons.forEach((polygon) => {
      const path = polygonPath(polygon);
      if (path.length < 3) return;
      const poly = new google.maps.Polygon({
        paths: path,
        strokeColor: polygon.color,
        strokeWeight: 2,
        fillColor: polygon.color,
        fillOpacity: 0.13,
        map: mapRef.current,
      });
      poly.addListener('click', (event: any) => {
        new google.maps.InfoWindow({
          position: event.latLng,
          content: `<b>${polygon.name}</b><br/>${polygon.admin?.name ?? 'Distributor'}`,
        }).open(mapRef.current);
      });
      overlaysRef.current.push(poly);
      path.forEach((p) => { bounds.extend(p); hasBounds = true; });
    });

    (data.customers ?? []).forEach((customer) => {
      if (customer.latitude == null || customer.longitude == null) return;
      const position = { lat: customer.latitude, lng: customer.longitude };
      const marker = new google.maps.Marker({
        position,
        map: mapRef.current,
        title: customer.name,
        icon: { url: markerSvg('#D32F2F'), scaledSize: new google.maps.Size(24, 24) },
      });
      addInfo(marker, `<b>${customer.name}</b><br/>${customer.mobile}<br/>${customer.area ?? ''}<br/>Driver: ${customer.driver?.name ?? 'Not assigned'}`);
      overlaysRef.current.push(marker);
      bounds.extend(position);
      hasBounds = true;
    });

    data.drivers.forEach((driver) => {
      const loc = driver.latestLocation;
      if (!loc) return;
      const position = { lat: loc.latitude, lng: loc.longitude };
      const color = driver.isOnDuty && driver.isLocationFresh ? '#179A33' : '#CA8A04';
      const marker = new google.maps.Marker({
        position,
        map: mapRef.current,
        title: driver.name,
        icon: { url: markerSvg(color, 'D'), scaledSize: new google.maps.Size(30, 30) },
      });
      addInfo(marker, `<b>${driver.name}</b><br/>${driver.vehicle?.number ?? 'No vehicle'}<br/>${driver.isOnDuty ? 'On duty' : 'Off duty'}<br/>Last ping: ${dayjs(loc.recordedAt).format('HH:mm:ss')}`);
      overlaysRef.current.push(marker);
      bounds.extend(position);
      hasBounds = true;

      driver.activeDeliveries.forEach((delivery) => {
        const c = delivery.customer;
        if (c.latitude == null || c.longitude == null) return;
        const line = new google.maps.Polyline({
          path: [position, { lat: c.latitude, lng: c.longitude }],
          geodesic: true,
          strokeColor: '#055152',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          map: mapRef.current,
        });
        overlaysRef.current.push(line);
      });
    });

    if (hasBounds) mapRef.current.fitBounds(bounds, 48);
  }, [data, mapsReady]);

  const clearDraft = () => {
    setDraftPath([]);
    draftOverlayRef.current?.setMap(null);
    draftOverlayRef.current = null;
  };

  const onDuty = data?.drivers.filter((d) => d.isOnDuty).length ?? 0;
  const fresh = data?.drivers.filter((d) => d.isLocationFresh).length ?? 0;
  const activeDeliveries = data?.drivers.reduce((sum, d) => sum + d.activeDeliveries.length, 0) ?? 0;
  const customerPins = data?.customers?.length ?? 0;

  return (
    <Box>
      <PageHeader
        title="Live Tracking"
        subtitle="Google Maps live driver, customer, delivery and polygon tracking"
        action={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} onClick={() => refetch()} disabled={isLoading}>Refresh</Button>
            <Button
              variant={drawMode ? 'outlined' : 'contained'}
              startIcon={<PolylineIcon />}
              onClick={() => setDrawMode((v) => !v)}
            >
              {drawMode ? 'Cancel Drawing' : 'Draw Polygon'}
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
                <Chip label={`${customerPins} customer pins`} color="error" variant="outlined" />
              </Stack>
            </Card>

            {drawMode && (
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={800}>New Service Polygon</Typography>
                <Typography variant="caption" color="text.secondary">Click around the map boundary. Double-click to finish, then drag points to adjust.</Typography>
                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                  {isSuperAdmin && (
                    <TextField select size="small" label="Distributor" value={polygonAdminId} onChange={(e) => setPolygonAdminId(e.target.value)}>
                      {admins.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                    </TextField>
                  )}
                  <TextField size="small" label="Polygon name" value={polygonName} onChange={(e) => setPolygonName(e.target.value)} />
                  <TextField size="small" label="Color" value={polygonColor} onChange={(e) => setPolygonColor(e.target.value)} />
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={clearDraft}>Clear</Button>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={() => createPolygon.mutate()} disabled={createPolygon.isPending || draftPath.length < 3}>
                      Save
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{draftPath.length} point(s) selected</Typography>
                </Stack>
              </Card>
            )}

            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={800}>Drivers</Typography>
              <Stack spacing={1.25} sx={{ mt: 1.5, maxHeight: 260, overflow: 'auto', pr: 0.5 }}>
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
                  </Box>
                ))}
              </Stack>
            </Card>

            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={800}>Service Polygons</Typography>
              <Stack spacing={1} sx={{ mt: 1.25, maxHeight: 230, overflow: 'auto' }}>
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
        Google Maps is active. Red dots are customer delivery locations; driver markers show live pings.
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
