import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Card, Badge, Loader, EmptyState } from '../components/ui';
import { billingApi, paymentApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useAppSelector } from '../store/hooks';
import { config } from '../config';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

export default function BillingScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const onPrimary = '#FFFFFF';
  const user = useAppSelector((s) => s.auth.user);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setInvoices(await billingApi.invoices()); } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pay = async (invoice: any) => {
    setPaying(invoice.id);
    try {
      const order = await paymentApi.createOrder(Number(invoice.dueAmount), invoice.id);
      const options = {
        description: `Invoice ${invoice.invoiceNumber}`,
        currency: 'INR',
        key: order.keyId ?? config.razorpayKeyId,
        amount: order.amount,
        order_id: order.razorpayOrderId,
        name: 'WaterFlow',
        prefill: { contact: user?.mobile, name: user?.name },
        theme: { color: colors.primary },
      };
      const data: any = await RazorpayCheckout.open(options);
      await paymentApi.verify({
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: data.razorpay_payment_id,
        razorpaySignature: data.razorpay_signature,
      });
      Alert.alert(t('billingCustomer.successTitle'), t('billingCustomer.successMsg'));
      load();
    } catch (e: any) {
      if (e?.code !== 0 && e?.code !== 2) Alert.alert(t('billingCustomer.paymentTitle'), e?.description ?? errorMessage(e));
    } finally {
      setPaying(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      <FlatList
        data={invoices}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<EmptyState text={t('billingCustomer.empty')} />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.num}>{item.invoiceNumber}</Text>
              <Badge status={item.status} />
            </View>
            <Text style={styles.period}>{dayjs(item.periodStart).format('DD MMM')} – {dayjs(item.periodEnd).format('DD MMM YYYY')}</Text>
            <View style={styles.amounts}>
              <View><Text style={styles.label}>{t('billingCustomer.total')}</Text><Text style={styles.value}>₹{item.totalAmount}</Text></View>
              <View><Text style={styles.label}>{t('billingCustomer.paid')}</Text><Text style={styles.value}>₹{item.paidAmount}</Text></View>
              <View><Text style={styles.label}>{t('billingCustomer.due')}</Text><Text style={[styles.value, { color: colors.error }]}>₹{item.dueAmount}</Text></View>
            </View>
            {Number(item.dueAmount) > 0 && (
              <TouchableOpacity style={styles.payBtn} onPress={() => pay(item)} disabled={paying === item.id}>
                <Text style={[styles.payText, { color: onPrimary }]}>{paying === item.id ? t('billingCustomer.processing') : t('billingCustomer.pay', { amount: item.dueAmount })}</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}
      />
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    num: { fontWeight: '800', color: colors.text, fontSize: 15 },
    period: { color: colors.textMuted, marginTop: 6 },
    amounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    label: { color: colors.textMuted, fontSize: 12 },
    value: { fontWeight: '700', color: colors.text, fontSize: 16 },
    payBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
    payText: { fontWeight: '800' },
  });
