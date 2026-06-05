import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, TextField, MenuItem, Stack, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { driverApi } from '../api/endpoints';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';

export default function Drivers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', search, status, page, pageSize],
    queryFn: () => driverApi.list({ search, status: status || undefined, page: page + 1, limit: pageSize }),
  });

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'mobile', headerName: 'Mobile', width: 130 },
    { field: 'zone', headerName: 'Zone', width: 130, valueFormatter: (v) => v ?? '—' },
    {
      field: 'vehicle', headerName: 'Vehicle', width: 140,
      renderCell: (p) => (p.value ? p.value.number : '—'),
    },
    {
      field: '_count', headerName: 'Customers', width: 110,
      renderCell: (p) => p.value?.customers ?? 0,
    },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
      renderCell: (p) => (
        <>
          <IconButton size="small" onClick={() => navigate(`/drivers/${p.row.id}`)}><VisibilityIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => navigate(`/drivers/${p.row.id}/edit`)}><EditIcon fontSize="small" /></IconButton>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Drivers"
        subtitle="Manage delivery drivers, vehicles and zones"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/drivers/new')}>Add Driver</Button>}
      />
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Search name / mobile" value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 280 }} />
          <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} size="small" sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="INACTIVE">Inactive</MenuItem>
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
