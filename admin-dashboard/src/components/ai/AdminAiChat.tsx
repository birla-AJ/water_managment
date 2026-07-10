import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Fab,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { aiApi } from '../../api/endpoints';
import type { AiChatResponse } from '../../types';
import { BRAND_GRADIENT } from '../../theme/theme';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  data?: AiChatResponse;
}

const COLORS = ['#0E8C84', '#DABD71', '#2563EB', '#2E7D32', '#CA8A04', '#D32F2F'];

function MiniChart({ data }: { data: AiChatResponse }) {
  if (!data.chart || data.chart.data.length === 0) return null;
  const c = data.chart;
  return (
    <Box sx={{ height: 160, mt: 1.25 }}>
      <Typography variant="caption" fontWeight={800} sx={{ display: 'block', mb: 0.5 }}>{c.title}</Typography>
      <ResponsiveContainer width="100%" height="90%">
        {c.type === 'line' ? (
          <LineChart data={c.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={c.xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <ChartTooltip />
            <Line type="monotone" dataKey={c.yKey} stroke="#0E8C84" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        ) : c.type === 'pie' ? (
          <PieChart>
            <ChartTooltip />
            <Pie data={c.data} dataKey={c.yKey} nameKey={c.xKey} outerRadius={62} label>
              {c.data.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
            </Pie>
          </PieChart>
        ) : (
          <BarChart data={c.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={c.xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <ChartTooltip />
            <Bar dataKey={c.yKey} fill="#0E8C84" radius={[5, 5, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Box>
  );
}

function DataPreview({ data }: { data: AiChatResponse }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      {data.cards && data.cards.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {data.cards.map((c) => <Chip key={c.label} label={`${c.label}: ${c.value}`} size="small" sx={{ fontWeight: 700 }} />)}
        </Stack>
      )}
      <MiniChart data={data} />
      {data.table && data.table.rows.length > 0 && (
        <Box sx={{ mt: 1.25, maxHeight: 190, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>{data.table.columns.map((col) => <TableCell key={col} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{col}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {data.table.rows.slice(0, 8).map((row, idx) => (
                <TableRow key={idx}>
                  {data.table!.columns.map((col) => <TableCell key={col}>{row[col] ?? '-'}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

export default function AdminAiChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Ask about earnings, drivers, payments, billing, inventory, areas, or customer growth.' },
  ]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data: suggestions } = useQuery({ queryKey: ['ai-suggestions'], queryFn: aiApi.suggestions, enabled: open });
  const ask = useMutation({
    mutationFn: ({ message, intent }: { message: string; intent?: string }) => aiApi.chat(message, intent),
    onSuccess: (data) => setMessages((prev) => [...prev, { role: 'assistant', text: data.answer, data }]),
    onError: (err: any) => setMessages((prev) => [...prev, { role: 'assistant', text: err?.response?.data?.message ?? 'AI chat failed. Please try again.' }]),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ask.isPending, open]);

  const canSend = input.trim().length > 1 && !ask.isPending;
  const quick = useMemo(() => suggestions ?? ['Monthly earning', 'Daily performance', 'Pending payments', 'Driver performance', 'Inventory status'], [suggestions]);

  const send = (text = input, intent?: string) => {
    const message = text.trim();
    if (!message || ask.isPending) return;
    setMessages((prev) => [...prev, { role: 'user', text: message }]);
    setInput('');
    ask.mutate({ message, intent });
  };

  return (
    <>
      <Tooltip title="AI assistant">
        <Fab
          color="primary"
          onClick={() => setOpen((v) => !v)}
          sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1300, background: BRAND_GRADIENT }}
        >
          <SmartToyOutlinedIcon />
        </Fab>
      </Tooltip>

      {open && (
        <Paper
          elevation={12}
          sx={{
            position: 'fixed',
            right: { xs: 12, sm: 24 },
            bottom: 92,
            zIndex: 1300,
            width: { xs: 'calc(100vw - 24px)', sm: 500 },
            maxWidth: 500,
            height: { xs: '76vh', sm: 650 },
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ p: 2, background: BRAND_GRADIENT, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToyOutlinedIcon />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={900}>WaterFlow AI</Typography>
              <Typography variant="caption">Business reports in text, table and chart</Typography>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#fff' }}><CloseIcon fontSize="small" /></IconButton>
          </Box>

          <Box
            sx={{
              p: 1.25,
              display: 'flex',
              gap: 0.75,
              overflowX: 'auto',
              overflowY: 'hidden',
              bgcolor: '#FFFDF9',
              scrollSnapType: 'x proximity',
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(5,81,82,0.22)', borderRadius: 99 },
            }}
          >
            {quick.map((q) => (
              <Chip
                key={q}
                label={q}
                variant="outlined"
                clickable
                onClick={() => send(q, q)}
                sx={{
                  flex: '0 0 auto',
                  maxWidth: '100%',
                  height: 30,
                  borderRadius: 99,
                  fontWeight: 800,
                  color: 'primary.main',
                  bgcolor: '#fff',
                  '& .MuiChip-label': {
                    px: 1.25,
                    whiteSpace: 'nowrap',
                  },
                }}
              />
            ))}
          </Box>
          <Divider />

          <Box sx={{ flex: 1, overflow: 'auto', p: 1.5, bgcolor: '#FFFDF9' }}>
            <Stack spacing={1.25}>
              {messages.map((m, idx) => (
                <Box key={idx} sx={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: m.role === 'user' ? '86%' : '100%', width: m.data ? '100%' : 'auto' }}>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 1.5,
                      bgcolor: m.role === 'user' ? 'primary.main' : '#fff',
                      color: m.role === 'user' ? '#fff' : 'text.primary',
                      border: m.role === 'assistant' ? '1px solid' : 'none',
                      borderColor: 'divider',
                      boxShadow: m.role === 'assistant' ? '0 8px 22px -18px rgba(5,81,82,0.5)' : 'none',
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.text}</Typography>
                    {m.data && <DataPreview data={m.data} />}
                  </Box>
                </Box>
              ))}
              {ask.isPending && <CircularProgress size={20} />}
              <div ref={bottomRef} />
            </Stack>
          </Box>

          <Box sx={{ p: 1.25, display: 'flex', gap: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Ask: monthly report, pending payments..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) send(); } }}
            />
            <IconButton color="primary" disabled={!canSend} onClick={() => send()}><SendIcon /></IconButton>
          </Box>
        </Paper>
      )}
    </>
  );
}
