// Briques d'interface : grandes cibles tactiles, textes lisibles, couleurs issues du thème.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { STATUS_GLYPH, type GlucoseStatus } from '@/lib/glucose';
import { useTheme } from '@/theme/settings';
import { radius, space, type Colors } from '@/theme/tokens';
import { SyncBanner } from './SyncBanner';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ---------- Texte ----------

type Variant = 'display' | 'title' | 'h2' | 'body' | 'bodyBold' | 'small' | 'caption';
const SIZES: Record<Variant, { size: number; weight: TextStyle['fontWeight'] }> = {
  display: { size: 44, weight: '800' },
  title: { size: 26, weight: '800' },
  h2: { size: 19, weight: '700' },
  body: { size: 16, weight: '400' },
  bodyBold: { size: 16, weight: '700' },
  small: { size: 14, weight: '400' },
  caption: { size: 12, weight: '500' },
};

export function T({
  v = 'body',
  color,
  muted,
  center,
  style,
  children,
  numberOfLines,
}: {
  v?: Variant;
  color?: string;
  muted?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
}) {
  const { c, fs } = useTheme();
  const s = SIZES[v];
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          color: color ?? (muted ? c.textMuted : c.text),
          fontSize: fs(s.size),
          lineHeight: Math.round(fs(s.size) * 1.32),
          fontWeight: s.weight,
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

// ---------- Mise en page ----------

export function Screen({
  children,
  title,
  subtitle,
  right,
  scroll = true,
  safeTop = false,
  contentStyle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  scroll?: boolean;
  safeTop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const header = title ? (
    <View style={styles.screenHeader}>
      <View style={{ flex: 1 }}>
        <T v="title">{title}</T>
        {subtitle ? <T muted>{subtitle}</T> : null}
      </View>
      {right}
    </View>
  ) : null;
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.screenContent, contentStyle]}
      keyboardShouldPersistTaps="handled">
      {header}
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentStyle]}>
      {header ? <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg }}>{header}</View> : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={safeTop ? ['top', 'left', 'right'] : ['left', 'right']} style={{ flex: 1, backgroundColor: c.bg }}>
      <SyncBanner />
      <View style={styles.maxWidth}>{body}</View>
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
  tone,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const bg = tone ? c[`${tone}Soft` as keyof Colors] : c.surface;
  const border = tone ? c[tone] : c.border;
  const base = [styles.card, { backgroundColor: bg, borderColor: border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { opacity: 0.75 }]}>
      {children}
    </Pressable>
  );
}

export function Row({ children, style, gap = space.sm }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Row style={{ marginTop: space.lg, marginBottom: space.sm, justifyContent: 'space-between' }}>
      <T v="h2">{children}</T>
      {right}
    </Row>
  );
}

// ---------- Boutons ----------

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  big,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  big?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, fs } = useTheme();
  const palette = {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    success: { bg: c.success, fg: c.onPrimary, border: c.success },
    danger: { bg: c.danger, fg: c.onPrimary, border: c.danger },
    secondary: { bg: c.primarySoft, fg: c.primary, border: c.primary },
    ghost: { bg: 'transparent', fg: c.primary, border: 'transparent' },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          minHeight: big ? 64 : small ? 40 : 52,
          paddingHorizontal: small ? space.md : space.lg,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={fs(big ? 26 : small ? 18 : 22)} color={palette.fg} /> : null}
          <Text style={{ color: palette.fg, fontSize: fs(big ? 19 : small ? 14 : 16), fontWeight: '700', textAlign: 'center' }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color,
  size = 24,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  size?: number;
}) {
  const { c, fs } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: c.primarySoft, opacity: pressed ? 0.7 : 1 }]}>
      <Ionicons name={icon} size={fs(size)} color={color ?? c.primary} />
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const { c, fs } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? c.primary : c.surfaceAlt,
          borderColor: selected ? c.primary : c.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      {selected ? <Ionicons name="checkmark" size={fs(16)} color={c.onPrimary} /> : icon ? <Ionicons name={icon} size={fs(16)} color={c.text} /> : null}
      <Text style={{ color: selected ? c.onPrimary : c.text, fontSize: fs(15), fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<V extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  const { c, fs } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: sel }}
            style={[styles.segment, sel && { backgroundColor: c.primary }]}>
            <Text style={{ color: sel ? c.onPrimary : c.text, fontWeight: '700', fontSize: fs(14), textAlign: 'center' }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Champs ----------

export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  const { c, fs } = useTheme();
  return (
    <View style={{ gap: space.xs, marginBottom: space.md }}>
      {label ? <T v="small" muted>{label}</T> : null}
      <TextInput
        placeholderTextColor={c.textMuted}
        {...props}
        style={[
          styles.input,
          { color: c.text, backgroundColor: c.surfaceAlt, borderColor: c.border, fontSize: fs(17) },
          style,
        ]}
      />
    </View>
  );
}

export function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Row style={{ paddingVertical: space.md, justifyContent: 'space-between' }} gap={space.md}>
        <View style={{ flex: 1 }}>
          <T v="bodyBold">{label}</T>
          {description ? <T v="small" muted>{description}</T> : null}
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: c.success, false: c.border }}
          thumbColor="#FFFFFF"
        />
      </Row>
    </Pressable>
  );
}

export function ListRow({
  icon,
  label,
  description,
  onPress,
  right,
  danger,
}: {
  icon?: IconName;
  label: string;
  description?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  const { c, fs } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.listRow, { borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}>
      {icon ? (
        <View style={[styles.listIcon, { backgroundColor: danger ? c.dangerSoft : c.primarySoft }]}>
          <Ionicons name={icon} size={fs(22)} color={danger ? c.danger : c.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T v="bodyBold" color={danger ? c.danger : undefined}>
          {label}
        </T>
        {description ? <T v="small" muted>{description}</T> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={fs(20)} color={c.textMuted} /> : null)}
    </Pressable>
  );
}

// ---------- Statuts ----------

export function statusColor(c: Colors, s: GlucoseStatus): string {
  return { hypo_severe: c.hypoSevere, hypo: c.hypo, cible: c.inRange, hyper: c.hyper, hyper_severe: c.hyperSevere }[s];
}

export function StatusPill({ status, big }: { status: GlucoseStatus; big?: boolean }) {
  const { c, fs } = useTheme();
  const t = useT();
  const col = statusColor(c, status);
  return (
    <View style={[styles.pill, { borderColor: col, backgroundColor: c.surface, paddingVertical: big ? 6 : 3 }]}>
      <Text style={{ color: col, fontWeight: '800', fontSize: fs(big ? 15 : 13) }}>
        {STATUS_GLYPH[status]} {t(`status_${status}`)}
      </Text>
    </View>
  );
}

export function Badge({ count }: { count: number }) {
  const { c, fs } = useTheme();
  if (count <= 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: c.danger }]}>
      <Text style={{ color: '#FFFFFF', fontSize: fs(12), fontWeight: '800' }}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: c.surfaceAlt }]}>
      <T v="h2" color={color} center>
        {value}
      </T>
      <T v="caption" muted center>
        {label}
      </T>
    </View>
  );
}

export function EmptyState({ icon, title, hint, children }: { icon: IconName; title: string; hint?: string; children?: React.ReactNode }) {
  const { c, fs } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: space.xl, gap: space.sm }}>
      <Ionicons name={icon} size={fs(44)} color={c.textMuted} />
      <T v="bodyBold" center>
        {title}
      </T>
      {hint ? (
        <T muted center>
          {hint}
        </T>
      ) : null}
      {children}
    </View>
  );
}

export function Notice({ icon = 'information-circle-outline', children, tone = 'primary' }: { icon?: IconName; children: React.ReactNode; tone?: 'primary' | 'warning' | 'danger' | 'success' }) {
  const { c, fs } = useTheme();
  return (
    <Row
      gap={space.sm}
      style={{ backgroundColor: c[`${tone}Soft` as keyof Colors], padding: space.md, borderRadius: radius.md, alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={fs(20)} color={c[tone]} />
      <View style={{ flex: 1 }}>
        <T v="small">{children}</T>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  maxWidth: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  screenContent: { padding: space.lg, paddingBottom: 48, gap: space.md },
  screenHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.sm },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  segmented: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, padding: 3, gap: 3 },
  segment: { flex: 1, minHeight: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 52 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  listIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  pill: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 10 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  stat: { flex: 1, borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: space.xs, gap: 2 },
});
