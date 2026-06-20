// Shared DataGrid styling for all grid screens — warm teal header, soft
// hairlines, teal row hover, no jarring focus outlines.
// Left untyped so the inferred object-literal type assigns cleanly to the
// DataGrid `sx` prop (an explicit SxProps<Theme> annotation fails to narrow).
export const dataGridSx = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders': { bgcolor: 'rgba(5,81,82,0.05)' },
  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 800, letterSpacing: 0.3, color: 'text.secondary' },
  '& .MuiDataGrid-columnSeparator': { display: 'none' },
  '& .MuiDataGrid-cell': { borderColor: 'rgba(5,81,82,0.06)' },
  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
  '& .MuiDataGrid-row': { transition: 'background-color .15s ease' },
  '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(5,81,82,0.05)' },
  '& .MuiDataGrid-footerContainer': { borderColor: 'rgba(5,81,82,0.08)' },
};
