import React, { useCallback, useState } from 'react';
import { View, FlatList, Modal, ScrollView, StyleSheet, Text, RefreshControl, Alert, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import type { AppColors } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';
import { errorMessage } from '../../api/client';
import { useAppSelector } from '../../store/hooks';
import { adminExpenseApi, adminExportApi } from '../api';
import type { Expense, ExpenseCategory } from '../types';
import { PageHeader, RowCard, Fab, Loader, EmptyState, FormInput, Segmented } from '../components/ui';

const CATEGORIES: ExpenseCategory[] = ['FUEL', 'VEHICLE_MAINTENANCE', 'SALARY', 'RENT', 'UTILITIES', 'SUPPLIES', 'DELIVERY', 'OTHER'];
const CATEGORY_ICONS: Record<string, string> = {
  FUEL: 'gas-station', VEHICLE_MAINTENANCE: 'car-wrench', SALARY: 'account-cash', RENT: 'home-city',
  UTILITIES: 'flash', SUPPLIES: 'package-variant', DELIVERY: 'truck-fast', OTHER: 'cash',
};

const PERIOD_VALUES = ['day', 'week', 'month', 'year', 'all'];

const emptyForm = () => ({
  title: '', category: 'OTHER' as ExpenseCategory, amount: '',
  expenseDate: dayjs().format('YYYY-MM-DD'), paymentMode: 'CASH', notes: '',
});

export default function ExpensesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const token = useAppSelector((s) => s.auth.accessToken);
  const catLabel = (c: string) => t(`admin.expenses.categories.${c}`);
  const PERIODS = PERIOD_VALUES.map((v) => ({ label: t(`admin.expenses.periods.${v}`), value: v }));
  const CATEGORY_OPTIONS: { label: string; value: '' | ExpenseCategory }[] = [
    { label: t('admin.expenses.allCategories'), value: '' },
    ...CATEGORIES.map((c) => ({ label: catLabel(c), value: c })),
  ];
  const PAYMENT_MODE_OPTIONS = [
    { label: t('admin.expenses.paymentModes.CASH'), value: 'CASH' },
    { label: t('admin.expenses.paymentModes.UPI'), value: 'UPI' },
    { label: t('admin.expenses.paymentModes.CARD'), value: 'CARD' },
  ];
  const [items, setItems] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [period, setPeriod] = useState('month');
  const [category, setCategory] = useState<'' | ExpenseCategory>('');
  const [picker, setPicker] = useState<null | 'period' | 'category'>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [open, setOpen] = useState(false);
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState(emptyForm());
  const [titleError, setTitleError] = useState('');
  const set = (k: keyof ReturnType<typeof emptyForm>) => (v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    if (k === 'title') setTitleError('');
  };

  const load = useCallback(async () => {
    try {
      const r = await adminExpenseApi.list({ period, category: category || undefined, limit: 100 });
      setItems(r.data?.items ?? []);
      setTotal(Number(r.data?.totalAmount ?? 0));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [period, category]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openCreate = () => { setF(emptyForm()); setTitleError(''); setOpen(true); };

  const exportExcel = async () => {
    if (!token) { Alert.alert(t('admin.common.error'), t('admin.expenses.signInToExport')); return; }
    const url = adminExportApi.expensesUrl({ period, category: category || undefined }, token);
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) Linking.openURL(url);
      else Alert.alert(t('admin.common.error'), t('admin.expenses.couldNotOpenExport'));
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); }
  };

  const save = async () => {
    if (!f.title.trim()) { setTitleError(t('admin.expenses.titleRequired')); return; }
    if (!Number(f.amount)) { Alert.alert(t('admin.common.error'), t('admin.expenses.enterValidAmount')); return; }
    setSaving(true);
    try {
      await adminExpenseApi.create({
        title: f.title,
        category: f.category,
        amount: Number(f.amount),
        expenseDate: f.expenseDate,
        paymentMode: f.paymentMode,
        notes: f.notes || undefined,
      });
      setOpen(false); load();
    } catch (e) { Alert.alert(t('admin.common.error'), errorMessage(e)); } finally { setSaving(false); }
  };

  const del = (e: Expense) => {
    Alert.alert(t('admin.expenses.deleteTitle'), t('admin.expenses.deleteConfirm', { title: e.title }), [
      { text: t('admin.common.cancel'), style: 'cancel' },
      { text: t('admin.common.delete'), style: 'destructive', onPress: async () => {
        try { await adminExpenseApi.remove(e.id); load(); } catch (err) { Alert.alert(t('admin.common.error'), errorMessage(err)); }
      } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListHeaderComponent={
          <View>
            <PageHeader
              subtitle={t('admin.expenses.subtitle')}
              action={
                <TouchableOpacity style={styles.exportBtn} activeOpacity={0.7} onPress={exportExcel}>
                  <Icon name="file-excel-outline" size={18} color={colors.primary} />
                  <Text style={styles.exportText}>{t('admin.common.export')}</Text>
                </TouchableOpacity>
              }
            />
            <View style={styles.filterRow}>
              <TouchableOpacity style={styles.dropdown} activeOpacity={0.7} onPress={() => setPicker('period')}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownLabel}>{t('admin.expenses.period')}</Text>
                  <Text style={styles.dropdownValue} numberOfLines={1}>{PERIODS.find((p) => p.value === period)?.label ?? t('admin.expenses.periods.month')}</Text>
                </View>
                <Icon name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdown} activeOpacity={0.7} onPress={() => setPicker('category')}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownLabel}>{t('admin.expenses.category')}</Text>
                  <Text style={styles.dropdownValue} numberOfLines={1}>{category ? catLabel(category) : t('admin.expenses.allCategories')}</Text>
                </View>
                <Icon name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>{t('admin.expenses.totalExpense')}</Text>
              <Text style={styles.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
              <Text style={styles.totalMeta}>{period === 'all' ? t('admin.expenses.allRecorded') : t('admin.expenses.forThis', { period: t(`admin.expenses.periodNouns.${period}`) })}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <RowCard
            leftIcon={CATEGORY_ICONS[item.category] ?? 'cash'}
            leftColor="#0E8388"
            title={item.title}
            subtitle={`${catLabel(item.category)} · ${item.paymentMode}`}
            meta={dayjs(item.expenseDate).format('DD MMM YYYY')}
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={styles.amount}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
                <TouchableOpacity onPress={() => del(item)} hitSlop={6}><Icon name="trash-can-outline" size={18} color={colors.error} /></TouchableOpacity>
              </View>
            }
          />
        )}
        ListEmptyComponent={loading ? <Loader /> : <EmptyState icon="cash-remove" text={t('admin.expenses.noExpenses')} />}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      />
      <Fab onPress={openCreate} side="left" bottom={20} />

      {/* Filter picker */}
      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setPicker(null)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>{picker === 'period' ? t('admin.expenses.selectPeriod') : t('admin.expenses.selectCategory')}</Text>
            <ScrollView>
              {(picker === 'category' ? CATEGORY_OPTIONS : PERIODS).map((opt) => {
                const active = picker === 'category' ? category === opt.value : period === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value || 'all'}
                    style={styles.pickerRow}
                    onPress={() => {
                      if (picker === 'category') setCategory(opt.value as '' | ExpenseCategory);
                      else setPeriod(opt.value);
                      setPicker(null);
                    }}
                  >
                    <Text style={[styles.pickerRowText, active && { color: colors.primary, fontWeight: '800' }]}>{opt.label}</Text>
                    {active && <Icon name="check" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{t('admin.expenses.addExpense')}</Text>
            <FormInput label={`${t('admin.expenses.expenseTitle')} *`} value={f.title} onChangeText={set('title')} error={titleError} />
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.formLabel}>{t('admin.expenses.category')}</Text>
              <TouchableOpacity style={styles.formDropdown} activeOpacity={0.7} onPress={() => setCatPickerOpen(true)}>
                <Text style={styles.formDropdownText}>{catLabel(f.category)}</Text>
                <Icon name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FormInput label={`${t('admin.expenses.amount')} *`} value={f.amount} onChangeText={set('amount')} keyboardType="numeric" prefix="₹" />
            <FormInput label={t('admin.expenses.date')} value={f.expenseDate} onChangeText={set('expenseDate')} placeholder="YYYY-MM-DD" />
            <Segmented
              label={t('admin.expenses.paymentMode')}
              options={PAYMENT_MODE_OPTIONS}
              value={f.paymentMode}
              onChange={(v) => setF((p) => ({ ...p, paymentMode: v }))}
            />
            <FormInput label={t('admin.expenses.notes')} value={f.notes} onChangeText={set('notes')} multiline />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <View style={{ flex: 1 }}><PrimaryButton title={t('admin.common.cancel')} variant="outline" onPress={() => setOpen(false)} /></View>
              <View style={{ flex: 1 }}><PrimaryButton title={t('admin.expenses.saveExpense')} onPress={save} loading={saving} /></View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category picker for the Add Expense form */}
      <Modal visible={catPickerOpen} transparent animationType="fade" onRequestClose={() => setCatPickerOpen(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setCatPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>{t('admin.expenses.selectCategory')}</Text>
            <ScrollView>
              {CATEGORIES.map((c) => {
                const active = f.category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={styles.pickerRow}
                    onPress={() => { setF((p) => ({ ...p, category: c })); setCatPickerOpen(false); }}
                  >
                    <Text style={[styles.pickerRowText, active && { color: colors.primary, fontWeight: '800' }]}>{catLabel(c)}</Text>
                    {active && <Icon name="check" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
    filterRow: { flexDirection: 'row', gap: 10 },
    dropdown: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder,
      paddingHorizontal: 14, paddingVertical: 10,
    },
    dropdownLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    dropdownValue: { fontSize: 14, color: colors.text, fontWeight: '800', marginTop: 2 },
    pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    pickerSheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28, maxHeight: '70%' },
    pickerTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
    pickerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    pickerRowText: { fontSize: 15, color: colors.text, fontWeight: '600' },
    formLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '700', marginBottom: 6 },
    formDropdown: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder,
      paddingHorizontal: 14, paddingVertical: 13,
    },
    formDropdownText: { fontSize: 15, color: colors.text, fontWeight: '600' },
    exportBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: colors.primary + '18', borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '44',
      paddingHorizontal: 12, paddingVertical: 9,
    },
    exportText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
    totalCard: {
      backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder,
      padding: 18, marginTop: 12, marginBottom: 6,
    },
    totalLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    totalValue: { fontSize: 30, color: colors.text, fontWeight: '800', marginTop: 4 },
    totalMeta: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    amount: { fontSize: 15, fontWeight: '800', color: colors.text },
  });
