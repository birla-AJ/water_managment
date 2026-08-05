import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Card, PrimaryButton } from '../components/ui';
import { orderApi, meApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

// Delivery charge per camper, by order quantity.
//  • 1–4 campers   → ₹10 each
//  • 5–9 campers   → ₹5 each
//  • 10–20 campers → ₹2 each
//  • more than 20  → FREE
function deliveryPerCamper(qty: number): number {
  if (qty > 20) return 0;
  if (qty >= 10) return 2;
  if (qty >= 5) return 5;
  return 10;
}

export default function OrderCamperScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [qty, setQty] = useState(1);
  const [remarks, setRemarks] = useState('');
  const [rate, setRate] = useState(30);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      meApi.profile()
        .then((p) => { if (p?.ratePerCamper != null) setRate(Number(p.ratePerCamper) || 30); })
        .catch(() => undefined);
    }, []),
  );

  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const perCamperDelivery = deliveryPerCamper(qty);
  const subtotal = qty * rate;
  const deliveryTotal = qty * perCamperDelivery;
  const total = subtotal + deliveryTotal;
  const freeDelivery = perCamperDelivery === 0;
  const campersToFree = qty <= 20 ? 21 - qty : 0;

  const placeOrder = async () => {
    setLoading(true);
    try {
      await orderApi.create(qty, remarks);
      Alert.alert(t('orderCamper.placedTitle'), t('orderCamper.placedMsg', { qty, total: inr(total) }));
      setQty(1); setRemarks('');
    } catch (e) {
      Alert.alert(t('common.error'), errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.title}>{t('orderCamper.title')}</Text>
        <Text style={styles.subtitle}>{t('orderCamper.subtitle')}</Text>

        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
            <Icon name="minus" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.qtyBox}>
            <Icon name="water" size={32} color={colors.primary} />
            <Text style={styles.qtyNum}>{qty}</Text>
          </View>
          <TouchableOpacity style={styles.stepBtn} onPress={() => setQty(qty + 1)}>
            <Icon name="plus" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t('orderCamper.remarksPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={remarks}
          onChangeText={setRemarks}
          multiline
        />
      </Card>

      <Card>
        <Text style={styles.summaryTitle}>{t('orderCamper.summaryTitle')}</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('orderCamper.campersRow', { qty, rate: inr(rate) })}</Text>
          <Text style={styles.rowValue}>{inr(subtotal)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>
            {t('orderCamper.delivery')} {freeDelivery ? '' : `(${qty} × ${inr(perCamperDelivery)})`}
          </Text>
          {freeDelivery ? (
            <Text style={[styles.rowValue, { color: colors.success }]}>{t('orderCamper.free')}</Text>
          ) : (
            <Text style={styles.rowValue}>{inr(deliveryTotal)}</Text>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.totalLabel}>{t('orderCamper.total')}</Text>
          <Text style={styles.totalValue}>{inr(total)}</Text>
        </View>

        {!freeDelivery && (
          <View style={styles.hint}>
            <Icon name="truck-fast-outline" size={16} color={colors.primary} />
            <Text style={styles.hintText}>{t('orderCamper.freeDeliveryHint', { n: campersToFree })}</Text>
          </View>
        )}
      </Card>

      <PrimaryButton title={t('orderCamper.placeOrder', { total: inr(total) })} onPress={placeOrder} loading={loading} />
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
    title: { fontSize: 20, fontWeight: '800', color: colors.text },
    subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: 24 },
    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    stepBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    qtyBox: { alignItems: 'center', marginHorizontal: 30 },
    qtyNum: { fontSize: 36, fontWeight: '800', color: colors.text },
    input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, minHeight: 70, textAlignVertical: 'top', color: colors.text },

    summaryTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 14 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
    rowLabel: { color: colors.textMuted, fontSize: 14 },
    rowValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
    totalLabel: { color: colors.text, fontSize: 17, fontWeight: '800' },
    totalValue: { color: colors.primary, fontSize: 22, fontWeight: '800' },
    hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: colors.primary + '14', borderRadius: 10, padding: 10 },
    hintText: { color: colors.primary, fontSize: 12.5, fontWeight: '600' },
  });
