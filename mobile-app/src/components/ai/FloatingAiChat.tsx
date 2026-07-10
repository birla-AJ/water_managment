import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { useAppSelector } from '../../store/hooks';
import { customerAiApi } from '../../api/endpoints';
import { adminAiApi } from '../../admin/api';
import { errorMessage } from '../../api/client';
import type { AppColors } from '../../theme/colors';

interface AiChatResponse {
  answer: string;
  provider: 'openai' | 'local';
  remainingQuestions?: number;
  cards?: Array<{ label: string; value: string | number }>;
  table?: { title: string; columns: string[]; rows: Array<Record<string, string | number>> };
  chart?: { title: string; xKey: string; yKey: string; data: Array<Record<string, string | number>> };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  data?: AiChatResponse;
}

const adminPrompts = ['Monthly earning', 'Daily performance', 'Pending payments', 'Driver performance', 'Inventory status'];
const customerPrompts = ['This month campers', 'My bill due', 'Payment history', 'Track delivery'];

function ResultDetails({ data, colors }: { data: AiChatResponse; colors: AppColors }) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const chart = data.chart;
  const values = chart?.data.map((d) => Number(d[chart.yKey] ?? 0)) ?? [];
  const max = Math.max(1, ...values);
  return (
    <View style={styles.details}>
      {!!data.cards?.length && (
        <View style={styles.cardGrid}>
          {data.cards.map((c) => (
            <View key={c.label} style={[styles.metricChip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{c.label}</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{String(c.value)}</Text>
            </View>
          ))}
        </View>
      )}

      {!!chart?.data.length && (
        <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.bgElevated }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>{chart.title}</Text>
          <View style={styles.bars}>
            {chart.data.slice(0, 6).map((d, idx) => {
              const label = String(d[chart.xKey] ?? '-');
              const value = Number(d[chart.yKey] ?? 0);
              return (
                <View key={`${label}-${idx}`} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.barFill, { width: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={[styles.barValue, { color: colors.text }]}>{value}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {!!data.table?.rows.length && (
        <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.bgElevated }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>{data.table.title}</Text>
          {data.table.rows.slice(0, 5).map((row, idx) => (
            <View key={idx} style={[styles.tableRow, { borderColor: colors.border }]}>
              {data.table!.columns.slice(0, 3).map((col) => (
                <View key={col} style={styles.tableCell}>
                  <Text style={[styles.tableLabel, { color: colors.textMuted }]} numberOfLines={1}>{col}</Text>
                  <Text style={[styles.tableValue, { color: colors.text }]} numberOfLines={1}>{String(row[col] ?? '-')}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function FloatingAiChat() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { accessToken, profileComplete, user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isDriver = user?.role === 'DRIVER';
  const visible = !!accessToken && !isDriver && (isAdmin || profileComplete);
  const prompts = isAdmin ? adminPrompts : customerPrompts;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: isAdmin ? 'Ask me for reports, performance, inventory, billing or pending payments.' : 'Ask me about your deliveries, bill, payments or active delivery.' },
  ]);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  if (!visible) return null;

  const ask = async (text = input, intent?: string) => {
    const message = text.trim();
    if (!message || loading) return;
    setMessages((prev) => [...prev, { role: 'user', text: message }]);
    setInput('');
    setLoading(true);
    try {
      const data: AiChatResponse = isAdmin ? await adminAiApi.chat(message, intent) : await customerAiApi.chat(message, intent);
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer, data }]);
    } catch (error) {
      const raw = errorMessage(error);
      const text = raw.toLowerCase().includes('database request')
        ? 'AI setup is pending on the server. Please try again after backend migration is updated.'
        : raw;
      setMessages((prev) => [...prev, { role: 'assistant', text }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  return (
    <>
      <TouchableOpacity activeOpacity={0.88} onPress={() => setOpen(true)} style={s.fab}>
        <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={s.fabInner}>
          <Icon name="robot-outline" color="#fff" size={26} />
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheetWrap}>
          <View style={s.sheet}>
            <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={s.header}>
              <View>
                <Text style={s.headerTitle}>WaterFlow AI</Text>
                <Text style={s.headerSub}>{isAdmin ? 'Reports in text, table and graph' : 'Your account assistant'}</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} style={s.closeBtn}>
                <Icon name="close" color="#fff" size={22} />
              </TouchableOpacity>
            </LinearGradient>

            <View style={s.promptStrip}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.prompts}
              >
              {prompts.map((p) => (
                <TouchableOpacity key={p} onPress={() => ask(p, p)} style={s.promptBtn} disabled={loading}>
                  <Text style={s.promptText} numberOfLines={1}>{p}</Text>
                </TouchableOpacity>
              ))}
              </ScrollView>
            </View>

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(_, idx) => String(idx)}
              contentContainerStyle={s.chatList}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => (
                <View style={[s.bubble, item.role === 'user' ? s.userBubble : s.aiBubble]}>
                  <Text style={[s.bubbleText, item.role === 'user' ? s.userText : s.aiText]}>{item.text}</Text>
                  {item.data?.remainingQuestions !== undefined && (
                    <Text style={s.remaining}>{item.data.remainingQuestions} questions left today</Text>
                  )}
                  {item.data && <ResultDetails data={item.data} colors={colors} />}
                </View>
              )}
              ListFooterComponent={loading ? <ActivityIndicator color={colors.primary} style={{ margin: 12 }} /> : null}
            />

            <View style={s.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={isAdmin ? 'Ask monthly report...' : 'Ask about my bill...'}
                placeholderTextColor={colors.textMuted}
                style={s.input}
                multiline
              />
              <TouchableOpacity onPress={() => ask()} disabled={loading || input.trim().length < 2} style={[s.sendBtn, (loading || input.trim().length < 2) && { opacity: 0.5 }]}>
                <Icon name="send" color="#fff" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    fab: {
      position: 'absolute',
      right: 18,
      bottom: 92,
      zIndex: 20,
      borderRadius: 30,
      elevation: 8,
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
    },
    fabInner: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
    sheetWrap: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
      height: '72%',
      backgroundColor: colors.bgElevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
    },
    header: { padding: 18, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
    headerSub: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
    promptStrip: {
      height: 58,
      flexGrow: 0,
      flexShrink: 0,
      borderBottomWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
    },
    prompts: { height: 58, paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
    promptBtn: {
      height: 36,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 13,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      maxWidth: 190,
    },
    promptText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
    chatList: { padding: 14, paddingBottom: 22, flexGrow: 1 },
    bubble: { maxWidth: '92%', padding: 12, borderRadius: 16, marginBottom: 10 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary },
    aiBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    bubbleText: { fontSize: 14, lineHeight: 20 },
    userText: { color: '#fff', fontWeight: '700' },
    aiText: { color: colors.text },
    remaining: { color: colors.textMuted, marginTop: 6, fontSize: 11, fontWeight: '700' },
    details: { marginTop: 10, gap: 8 },
    cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    metricChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minWidth: 118 },
    metricLabel: { fontSize: 11, fontWeight: '700' },
    metricValue: { marginTop: 2, fontSize: 14, fontWeight: '900' },
    panel: { borderWidth: 1, borderRadius: 14, padding: 10 },
    panelTitle: { fontSize: 13, fontWeight: '900', marginBottom: 8 },
    bars: { gap: 8 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    barLabel: { width: 72, fontSize: 11, fontWeight: '700' },
    barTrack: { flex: 1, height: 8, borderRadius: 8, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 8 },
    barValue: { width: 36, fontSize: 11, textAlign: 'right', fontWeight: '800' },
    tableRow: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 8, gap: 8 },
    tableCell: { flex: 1 },
    tableLabel: { fontSize: 10, fontWeight: '800' },
    tableValue: { fontSize: 12, fontWeight: '700', marginTop: 2 },
    inputRow: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderColor: colors.border, alignItems: 'flex-end' },
    input: { flex: 1, minHeight: 42, maxHeight: 96, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  });
