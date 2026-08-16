import React, { useMemo } from 'react';
import { Platform, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const INLINE_MARKERS = ['**', '__', '~~', '`', '*', '_'];

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

function getInlineStyle(marker, theme) {
  if (marker === '**' || marker === '__') {
    return { fontWeight: '700' };
  }

  if (marker === '*' || marker === '_') {
    return { fontStyle: 'italic' };
  }

  if (marker === '~~') {
    return { textDecorationLine: 'line-through' };
  }

  if (marker === '`') {
    return {
      fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
      backgroundColor: theme.border,
    };
  }

  return null;
}

function getInlineSegments(text, theme) {
  const segments = [];
  let buffer = '';
  let index = 0;

  const flushBuffer = () => {
    if (buffer) {
      segments.push({ text: buffer, style: null });
      buffer = '';
    }
  };

  while (index < text.length) {
    const marker = INLINE_MARKERS.find((candidate) => text.startsWith(candidate, index));

    if (!marker) {
      buffer += text[index];
      index += 1;
      continue;
    }

    const markerLength = marker.length;
    const closeIndex = text.indexOf(marker, index + markerLength);

    if (closeIndex === -1) {
      buffer += marker;
      index += markerLength;
      continue;
    }

    flushBuffer();
    segments.push({
      text: text.slice(index + markerLength, closeIndex),
      style: getInlineStyle(marker, theme),
    });
    index = closeIndex + markerLength;
  }

  flushBuffer();

  return segments;
}

export default function FormattedText({ content, fontSize = 16, style, numberOfLines }) {
  const { theme } = useTheme();

  const children = useMemo(() => {
    const lines = String(content || '').split('\n');
    const nodes = [];

    lines.forEach((line, lineIndex) => {
      const { text, prefix, style: lineStyle } = getLineDescriptor(line, fontSize);
      const segments = getInlineSegments(text, theme);

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
        return;
      }

      segments.forEach((segment, segmentIndex) => {
        nodes.push(
          <Text key={`${lineIndex}-${segmentIndex}`} style={[lineStyle, segment.style]}>
            {segment.text}
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
