import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { themes } from '../constants/colors';

const THEME_OPTIONS = [
  { id: 'light', label: '☀️  Light' },
  { id: 'dark', label: '🌙  Dark' },
  { id: 'darkBlue', label: '🌌  Dark Blue' },
];

export default function Header({ title, showBack }) {
  const { theme, themeId, setThemeId } = useTheme();
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>

      <TouchableOpacity onPress={() => setMenuVisible(true)} style={[styles.themeSwitcher, { backgroundColor: theme.switcherBg }]}>
        <Text style={styles.themeIcon}>🎨</Text>
      </TouchableOpacity>

      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menu, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.menuTitle, { color: theme.primaryText }]}>Theme</Text>
            {THEME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.menuItem,
                  themeId === opt.id && { backgroundColor: themes[opt.id].primary + '22' },
                ]}
                onPress={() => {
                  setThemeId(opt.id);
                  setMenuVisible(false);
                }}
              >
                <Text style={[styles.menuItemText, { color: theme.primaryText }, themeId === opt.id && { fontWeight: '800' }]}>
                  {opt.label}
                </Text>
                {themeId === opt.id && <Text style={{ color: theme.primary }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginRight: 8,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  themeSwitcher: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  themeIcon: {
    fontSize: 18,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menu: {
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 180,
    overflow: 'hidden',
  },
  menuTitle: {
    fontWeight: '800',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
  },
});

