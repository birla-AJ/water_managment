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
import { useTranslation } from 'react-i18next';

const DEFAULT_CENTER = { lat: 22.7196, lng: 75.8577 };
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? 'AIzaSyBqtNNRlrJDPr392gapSx7VPk3BkTVjDrM';
let googleMapsPromise: Promise<any> | null = null;

declare global {
  interface Window {
    google?: any;
    __wfGoogleMapsReady?: () => void;
  }
}

function loadGoogleMaps(): Promise<any> {
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  if (googleMapsPromise) return googleMapsPromise;
  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-maps-js') as HTMLScriptElement | null;
    const resolveIfReady = () => {
      if (window.google?.maps?.Map) {
        resolve(window.google);
        return true;
      }
      return false;
    };
    window.__wfGoogleMapsReady = () => resolveIfReady();
    if (existing) {
      if (resolveIfReady()) return;
      existing.addEventListener('load', resolveIfReady, { once: true });
      existing.addEventListener('error', (event) => {
        googleMapsPromise = null;
        reject(event);
      }, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-js';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}&libraries=drawing,geometry&loading=async&callback=__wfGoogleMapsReady`;
    script.async = true;
    script.defer = true;
    script.onerror = (event) => {
      googleMapsPromise = null;
      reject(event);
    };
    document.body.appendChild(script);
  });
  return googleMapsPromise;
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

function vehicleMarkerSvg(color: string, emoji = '🚚') {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="46" height="54" viewBox="0 0 46 54">
      <filter id="shadow" x="-30%" y="-20%" width="160%" height="160%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#123" flood-opacity="0.28"/>
      </filter>
      <path d="M23 51C17 42 7 35 7 22C7 13.2 14.2 6 23 6s16 7.2 16 16c0 13-10 20-16 29z" fill="${color}" filter="url(#shadow)"/>
      <circle cx="23" cy="22" r="15" fill="white" opacity="0.96"/>
      <text x="23" y="29" text-anchor="middle" font-size="20" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${emoji}</text>
    </svg>
  `)}`;
}

function emojiPinSvg(color: string, emoji: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52">
      <filter id="shadow" x="-30%" y="-20%" width="160%" height="160%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#123" flood-opacity="0.25"/>
      </filter>
      <path d="M22 49C16.2 40.4 7 33.5 7 21.5C7 13.2 13.7 6.5 22 6.5s15 6.7 15 15C37 33.5 27.8 40.4 22 49z" fill="${color}" filter="url(#shadow)"/>
      <circle cx="22" cy="21.5" r="13.5" fill="white"/>
      <text x="22" y="27.5" text-anchor="middle" font-size="18" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${emoji}</text>
    </svg>
  `)}`;
}

export default function LiveTracking() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const drawingRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const draftOverlaysRef = useRef<any[]>([]);
  const draftOverlayRef = useRef<any>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [draftPath, setDraftPath] = useState<Array<{ lat: number; lng: number }>>([]);
  const [polygonName, setPolygonName] = useState('');
  const [polygonColor, setPolygonColor] = useState('#0E8C84');
  const [polygonAdminId, setPolygonAdminId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ServiceAreaPolygon | null>(null);

  const removeDraftPoint = (index: number) => {
    setDraftPath((prev) => prev.filter((_, idx) => idx !== index));
  };

  const clearDraftVisuals = () => {
    draftOverlayRef.current?.setMap(null);
    draftOverlayRef.current = null;
    draftOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    draftOverlaysRef.current = [];
  };

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
      if (draftPath.length < 3) throw new Error(t('liveTracking.drawFirst'));
      if (!polygonName.trim()) throw new Error(t('liveTracking.enterName'));
      if (isSuperAdmin && !polygonAdminId) throw new Error(t('liveTracking.selectDistributor'));
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
      enqueueSnackbar(t('liveTracking.polygonSavedToast'), { variant: 'success' });
      setDraftPath([]);
      setDrawMode(false);
      setPolygonName('');
      clearDraftVisuals();
      qc.invalidateQueries({ queryKey: ['live-tracking'] });
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const removePolygon = useMutation({
    mutationFn: (id: string) => trackingApi.removePolygon(id),
    onSuccess: () => {
      enqueueSnackbar(t('liveTracking.polygonDeletedToast'), { variant: 'success' });
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
        if (google.maps.drawing?.DrawingManager) {
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
            clearDraftVisuals();
            draftOverlayRef.current = poly;
            const path = poly.getPath().getArray().map((p: any) => ({ lat: p.lat(), lng: p.lng() }));
            setDraftPath(path);
            drawingRef.current?.setDrawingMode(null);
          });
        }
        setMapsReady(true);
      })
      .catch((error) => {
        if (window.google?.maps?.Map) {
          setMapsReady(true);
          return;
        }
        console.error('[LiveTracking] Google Maps load failed', error);
        enqueueSnackbar(t('liveTracking.mapsLoadFailed'), { variant: 'error' });
      });
    return () => { mounted = false; };
  }, [enqueueSnackbar, polygonColor]);

  useEffect(() => {
    if (!mapsReady || !window.google?.maps || !drawingRef.current) return;
    drawingRef.current.setDrawingMode(null);
  }, [drawMode, mapsReady]);

  useEffect(() => {
    if (!draftOverlayRef.current) return;
    draftOverlayRef.current.setOptions({ fillColor: polygonColor, strokeColor: polygonColor });
  }, [polygonColor]);

  useEffect(() => {
    if (!mapsReady || !window.google?.maps || !mapRef.current) return undefined;
    const google = window.google;
    mapRef.current.setOptions({ draggableCursor: drawMode ? 'crosshair' : null });
    if (!drawMode) return undefined;
    const listener = mapRef.current.addListener('click', (event: any) => {
      if (!event.latLng) return;
      setDraftPath((prev) => [...prev, { lat: event.latLng.lat(), lng: event.latLng.lng() }]);
    });
    return () => {
      listener.remove();
      mapRef.current?.setOptions({ draggableCursor: null });
    };
  }, [drawMode, mapsReady]);

  useEffect(() => {
    if (!mapsReady || !window.google?.maps || !mapRef.current) return;
    const google = window.google;
    draftOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    draftOverlaysRef.current = [];
    if (draftPath.length === 0) return;

    draftPath.forEach((point, idx) => {
      const marker = new google.maps.Marker({
        position: point,
        map: mapRef.current,
        label: { text: String(idx + 1), color: '#fff', fontWeight: '800' },
        icon: { url: markerSvg(polygonColor), scaledSize: new google.maps.Size(24, 24) },
        zIndex: 1000,
      });
      marker.addListener('click', () => removeDraftPoint(idx));
      draftOverlaysRef.current.push(marker);
    });

    const line = new google.maps.Polyline({
      path: draftPath,
      strokeColor: polygonColor,
      strokeOpacity: 0.95,
      strokeWeight: 3,
      map: mapRef.current,
      zIndex: 999,
    });
    draftOverlaysRef.current.push(line);

    if (draftPath.length >= 3) {
      const polygon = new google.maps.Polygon({
        paths: draftPath,
        strokeColor: polygonColor,
        strokeWeight: 3,
        fillColor: polygonColor,
        fillOpacity: 0.16,
        clickable: false,
        map: mapRef.current,
        zIndex: 998,
      });
      draftOverlaysRef.current.push(polygon);
    }
  }, [draftPath, mapsReady, polygonColor]);

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
          content: `<b>${polygon.name}</b><br/>${polygon.admin?.name ?? t('liveTracking.distributorFallback')}`,
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
        icon: { url: emojiPinSvg('#D32F2F', '📱'), scaledSize: new google.maps.Size(38, 45), anchor: new google.maps.Point(19, 45) },
      });
      addInfo(marker, `<b>${customer.name}</b><br/>${customer.mobile}<br/>${customer.area ?? ''}<br/>${t('liveTracking.drivers')}: ${customer.driver?.name ?? t('liveTracking.notAssigned')}`);
      overlaysRef.current.push(marker);
      bounds.extend(position);
      hasBounds = true;
    });

    (data.hubs ?? []).forEach((hub) => {
      if (hub.latitude == null || hub.longitude == null) return;
      const position = { lat: hub.latitude, lng: hub.longitude };
      const marker = new google.maps.Marker({
        position,
        map: mapRef.current,
        title: hub.name,
        icon: { url: emojiPinSvg('#2563EB', '🏭'), scaledSize: new google.maps.Size(42, 50), anchor: new google.maps.Point(21, 50) },
        zIndex: 800,
      });
      addInfo(marker, `<b>${hub.name}</b><br/>${t('liveTracking.distributorHub')}<br/>${hub.phone ?? hub.mobile ?? hub.email ?? ''}`);
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
        icon: { url: vehicleMarkerSvg(color, driver.vehicle?.type?.toLowerCase().includes('bike') ? '🛵' : '🚚'), scaledSize: new google.maps.Size(42, 49), anchor: new google.maps.Point(21, 49) },
      });
      addInfo(marker, `<b>${driver.name}</b><br/>${driver.vehicle?.number ?? t('liveTracking.noVehicle')}<br/>${driver.isOnDuty ? t('liveTracking.onDuty') : t('liveTracking.offDuty')}<br/>${t('liveTracking.lastPing', { time: dayjs(loc.recordedAt).format('HH:mm:ss') })}`);
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
    clearDraftVisuals();
  };

  const onDuty = data?.drivers.filter((d) => d.isOnDuty).length ?? 0;
  const fresh = data?.drivers.filter((d) => d.isLocationFresh).length ?? 0;
  const activeDeliveries = data?.drivers.reduce((sum, d) => sum + d.activeDeliveries.length, 0) ?? 0;
  const customerPins = data?.customers?.length ?? 0;
  const hubPins = data?.hubs?.length ?? 0;

  return (
    <Box>
      <PageHeader
        title={t('nav.liveTracking')}
        subtitle={t('liveTracking.subtitle')}
        action={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} onClick={() => refetch()} disabled={isLoading}>{t('liveTracking.refresh')}</Button>
            <Button
              variant={drawMode ? 'outlined' : 'contained'}
              startIcon={<PolylineIcon />}
              onClick={() => setDrawMode((v) => !v)}
            >
              {drawMode ? t('liveTracking.cancelDrawing') : t('liveTracking.drawPolygon')}
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
              <Typography variant="h6" fontWeight={800}>{t('liveTracking.today')}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                <Chip label={t('liveTracking.onDutyChip', { count: onDuty })} color="success" />
                <Chip label={t('liveTracking.liveChip', { count: fresh })} color="info" />
                <Chip label={t('liveTracking.activeDeliveriesChip', { count: activeDeliveries })} />
                <Chip label={t('liveTracking.customerPinsChip', { count: customerPins })} color="error" variant="outlined" />
                <Chip label={t('liveTracking.hubPinsChip', { count: hubPins })} color="primary" variant="outlined" />
              </Stack>
            </Card>

            {drawMode && (
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={800}>{t('liveTracking.newPolygon')}</Typography>
                <Typography variant="caption" color="text.secondary">{t('liveTracking.drawHint')}</Typography>
                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                  {isSuperAdmin && (
                    <TextField select size="small" label={t('liveTracking.distributor')} value={polygonAdminId} onChange={(e) => setPolygonAdminId(e.target.value)}>
                      {admins.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                    </TextField>
                  )}
                  <TextField size="small" label={t('liveTracking.polygonName')} value={polygonName} onChange={(e) => setPolygonName(e.target.value)} />
                  <TextField size="small" label={t('liveTracking.color')} value={polygonColor} onChange={(e) => setPolygonColor(e.target.value)} />
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={clearDraft}>{t('liveTracking.clear')}</Button>
                    <Button variant="outlined" color="warning" onClick={() => setDraftPath((prev) => prev.slice(0, -1))} disabled={draftPath.length === 0}>{t('liveTracking.undoLast')}</Button>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={() => createPolygon.mutate()} disabled={createPolygon.isPending || draftPath.length < 3}>
                      {t('liveTracking.save')}
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{t('liveTracking.pointsSelected', { count: draftPath.length })}</Typography>
                  {draftPath.length > 0 && (
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                      {draftPath.map((point, idx) => (
                        <Chip
                          key={`${point.lat}-${point.lng}-${idx}`}
                          size="small"
                          color="error"
                          variant="outlined"
                          label={t('liveTracking.deletePointChip', { n: idx + 1 })}
                          onDelete={() => removeDraftPoint(idx)}
                          onClick={() => removeDraftPoint(idx)}
                        />
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Card>
            )}

            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={800}>{t('liveTracking.drivers')}</Typography>
              <Stack spacing={1.25} sx={{ mt: 1.5, maxHeight: 260, overflow: 'auto', pr: 0.5 }}>
                {(data?.drivers ?? []).map((driver) => (
                  <Box key={driver.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.25, bgcolor: 'background.paper' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight={800}>{driver.name}</Typography>
                      <Chip size="small" label={driver.isOnDuty ? t('liveTracking.onDuty') : t('liveTracking.off')} color={statusColor(driver) as any} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">{driver.vehicle?.number ?? t('liveTracking.noVehicle')} - {driver.zone ?? t('liveTracking.noZone')}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {driver.latestLocation ? t('liveTracking.lastPing', { time: dayjs(driver.latestLocation.recordedAt).format('HH:mm:ss') }) : t('liveTracking.noLocationYet')}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Card>

            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={800}>{t('liveTracking.servicePolygons')}</Typography>
              <Stack spacing={1} sx={{ mt: 1.25, maxHeight: 230, overflow: 'auto' }}>
                {(data?.polygons ?? []).map((polygon) => (
                  <Stack key={polygon.id} direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{polygon.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{polygon.admin?.name}</Typography>
                    </Box>
                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteTarget(polygon)}>{t('liveTracking.delete')}</Button>
                  </Stack>
                ))}
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 2 }}>
        {t('liveTracking.mapLegend')}
      </Alert>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('liveTracking.deletePolygonTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{t('liveTracking.deletePolygonBody', { name: deleteTarget?.name })}</Typography>
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => deleteTarget && removePolygon.mutate(deleteTarget.id)} disabled={removePolygon.isPending}>
            {t('liveTracking.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
