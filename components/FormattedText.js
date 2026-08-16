import React, { useMemo } from 'react';
import { Platform, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const INLINE_TOKEN_REGEX = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;

function getLineStyle(baseFontSize, level) {
  const sizeByLevel = {
    1: baseFontSize + 8,
    2: baseFontSize + 5,
    3: baseFontSize + 2,
  };

  const fontSize = sizeByLevel[level] || baseFontSize;

  return {
    fontSize,
    lineHeight: Math.round(fontSize * 1.45),
    fontWeight: level ? '700' : '400',
  };
}

function getLineDescriptor(line, baseFontSize) {
  if (/^###\s+/.test(line)) {
    return { text: line.replace(/^###\s+/, ''), prefix: '', style: getLineStyle(baseFontSize, 3) };
  }

  if (/^##\s+/.test(line)) {
    return { text: line.replace(/^##\s+/, ''), prefix: '', style: getLineStyle(baseFontSize, 2) };
  }

  if (/^#\s+/.test(line)) {
    return { text: line.replace(/^#\s+/, ''), prefix: '', style: getLineStyle(baseFontSize, 1) };
  }

  if (/^[-*]\s+/.test(line)) {
    return { text: line.replace(/^[-*]\s+/, ''), prefix: '• ', style: getLineStyle(baseFontSize, 0) };
  }

  return { text: line, prefix: '', style: getLineStyle(baseFontSize, 0) };
}

function getInlineStyle(token, theme) {
  if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
    return { text: token.slice(2, -2), style: { fontWeight: '700' } };
  }

  if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
    return { text: token.slice(1, -1), style: { fontStyle: 'italic' } };
  }

  if (token.startsWith('~~') && token.endsWith('~~')) {
    return { text: token.slice(2, -2), style: { textDecorationLine: 'line-through' } };
  }

  if (token.startsWith('`') && token.endsWith('`')) {
    return {
      text: token.slice(1, -1),
      style: {
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
        backgroundColor: theme.border,
      },
    };
  }

  return { text: token, style: null };
}

export default function FormattedText({ content, fontSize = 16, style, numberOfLines }) {
  const { theme } = useTheme();

  const children = useMemo(() => {
    const lines = String(content || '').split('\n');
    const nodes = [];

    lines.forEach((line, lineIndex) => {
      const { text, prefix, style: lineStyle } = getLineDescriptor(line, fontSize);
      const segments = text.split(INLINE_TOKEN_REGEX).filter(Boolean);

      if (lineIndex > 0) {
        nodes.push('\n');
      }

      if (prefix) {
        nodes.push(
          <Text key={`prefix-${lineIndex}`} style={lineStyle}>
            {prefix}
          </Text>,
        );
      }

      if (!segments.length) {
        nodes.push(
          <Text key={`line-${lineIndex}`} style={lineStyle}>
            {' '}
          </Text>,
        );
        return;
      }

      segments.forEach((segment, segmentIndex) => {
        const { text: segmentText, style: inlineStyle } = getInlineStyle(segment, theme);
        nodes.push(
          <Text key={`${lineIndex}-${segmentIndex}`} style={[lineStyle, inlineStyle]}>
            {segmentText}
          </Text>,
        );
      });
    });

    return nodes;
  }, [content, fontSize, theme]);

  return (
    <Text numberOfLines={numberOfLines} style={[{ color: theme.primaryText }, style]}>
      {children}
    </Text>
  );
}
