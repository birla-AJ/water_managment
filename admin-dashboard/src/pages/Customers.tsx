import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, TextField, MenuItem, Stack, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../api/endpoints';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import { useTranslation } from 'react-i18next';

export default function Customers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, status, page, pageSize],
    queryFn: () => customerApi.list({ search, status: status || undefined, page: page + 1, limit: pageSize }),
  });

  const columns: GridColDef[] = [
    { field: 'name', headerName: t('common.name'), flex: 1, minWidth: 150 },
    { field: 'mobile', headerName: t('common.mobile'), width: 130 },
    { field: 'area', headerName: t('customersPage.colArea'), width: 130 },
    { field: 'customerType', headerName: t('common.type'), width: 110 },
    { field: 'allocatedCampers', headerName: t('customersPage.colCampers'), width: 90 },
    { field: 'ratePerCamper', headerName: t('customersPage.colRate'), width: 90, valueFormatter: (v) => `₹${v ?? 0}` },
    { field: 'status', headerName: t('common.status'), width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: 'actions', headerName: t('common.actions'), width: 110, sortable: false,
      renderCell: (p) => (
        <>
          <IconButton size="small" onClick={() => navigate(`/customers/${p.row.id}`)}><VisibilityIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => navigate(`/customers/${p.row.id}/edit`)}><EditIcon fontSize="small" /></IconButton>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title={t('nav.customers')}
        subtitle={t('customersPage.subtitle')}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/customers/new')}>{t('customersPage.addCustomer')}</Button>}
      />
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label={t('customersPage.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 280 }} />
          <TextField select label={t('common.status')} value={status} onChange={(e) => setStatus(e.target.value)} size="small" sx={{ minWidth: 160 }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            <MenuItem value="ACTIVE">{t('common.active')}</MenuItem>
            <MenuItem value="INACTIVE">{t('common.inactive')}</MenuItem>
          </TextField>
        </Stack>
      </Card>
      <Card>
        <DataGrid
          autoHeight
          rows={data?.data ?? []}
          columns={columns}
          loading={isLoading}
          rowCount={data?.meta?.total ?? 0}
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m) => { setPage(m.page); setPageSize(m.pageSize); }}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
        />
      </Card>
    </Box>
  );
}
