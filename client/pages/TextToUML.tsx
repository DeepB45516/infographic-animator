import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, GitBranch, Download, Sparkles, Users, ArrowRight, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface DiagramData {
  type: 'usecase' | 'sequence';
  content: string;
  svg: string;
}

export default function TextToUML() {
  const [textInput, setTextInput] = useState('');
  const [diagramType, setDiagramType] = useState<'usecase' | 'sequence'>('usecase');
  const [diagramData, setDiagramData] = useState<DiagramData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: string; message: string } | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

  const showStatus = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 5000);
  }, []);

  const generateUseCaseDiagram = useCallback((text: string) => {
    // Extract actors and use cases with enhanced parsing
    const lines = text.split('\n').filter(line => line.trim());
    const actors: string[] = [];
    const useCases: string[] = [];
    const externalServices: string[] = [];
    const relationships: Array<{actor: string, useCase: string, type: 'uses' | 'extends' | 'includes'}> = [];
    const conditions: Array<{from: string, to: string, condition: string, type: 'extend' | 'include'}> = [];

    // Extract system name from text
    let systemName = 'System';

    lines.forEach(line => {
      const cleanLine = line.trim().toLowerCase();

      // Extract system name from patterns like "System:", "App:", or first line if it looks like a title
      if (cleanLine.includes('system:') || cleanLine.includes('application:') ||
          cleanLine.includes('app:') || cleanLine.includes('platform:')) {
        systemName = line.trim().replace(/^(system|application|app|platform):?\s*/i, '');
      }

      // Extract actors
      if (cleanLine.includes('actor') || cleanLine.match(/^(user|customer|admin|manager|employee):/)) {
        const actor = line.trim().replace(/^(actor|user|customer|admin|manager|employee):?\s*/i, '');
        if (actor && !actors.includes(actor)) {
          actors.push(actor);
        }
      }

      // Extract external services
      if (cleanLine.includes('service') || cleanLine.includes('system') || cleanLine.includes('provider')) {
        const service = line.trim().replace(/^(service|system|provider):?\s*/i, '');
        if (service && !externalServices.includes(service)) {
          externalServices.push(service);
        }
      }

      // Extract use cases
      if (cleanLine.includes('use case') || cleanLine.includes('function') ||
          cleanLine.match(/^(can|should|must|action)/) || cleanLine.includes('->')) {
        let useCase = line.trim().replace(/^(use case|function|action):?\s*/i, '');
        useCase = useCase.replace(/^(can|should|must)\s+/i, '');
        if (useCase && useCase.length > 3 && !useCases.includes(useCase)) {
          useCases.push(useCase);
        }
      }

      // Extract conditional relationships (extend/include)
      if (cleanLine.includes('extend') || cleanLine.includes('include') ||
          cleanLine.includes('if ') || cleanLine.includes('when ') || cleanLine.includes('only if')) {

        // Parse extend relationships: "A extends B if condition"
        if (cleanLine.includes('extend')) {
          const extendMatch = line.match(/(.+?)\s+extends?\s+(.+?)\s+(if|when|only if)\s+(.+)/i);
          if (extendMatch) {
            const [, fromUC, toUC, , condition] = extendMatch;
            const cleanFromUC = fromUC.trim();
            const cleanToUC = toUC.trim();

            if (!useCases.includes(cleanFromUC)) useCases.push(cleanFromUC);
            if (!useCases.includes(cleanToUC)) useCases.push(cleanToUC);

            conditions.push({
              from: cleanFromUC,
              to: cleanToUC,
              condition: condition.trim(),
              type: 'extend'
            });
          }
        }

        // Parse include relationships: "A includes B if condition"
        if (cleanLine.includes('include')) {
          const includeMatch = line.match(/(.+?)\s+includes?\s+(.+?)\s+(if|when|only if)\s+(.+)/i);
          if (includeMatch) {
            const [, fromUC, toUC, , condition] = includeMatch;
            const cleanFromUC = fromUC.trim();
            const cleanToUC = toUC.trim();

            if (!useCases.includes(cleanFromUC)) useCases.push(cleanFromUC);
            if (!useCases.includes(cleanToUC)) useCases.push(cleanToUC);

            conditions.push({
              from: cleanFromUC,
              to: cleanToUC,
              condition: condition.trim(),
              type: 'include'
            });
          }
        }

        // Parse general conditional use cases: "If condition then use case"
        if (cleanLine.match(/^(if|when)\s+.+\s+(then|:)\s+/i)) {
          const condMatch = line.match(/^(if|when)\s+(.+?)\s+(then|:)\s+(.+)/i);
          if (condMatch) {
            const [, , condition, , useCase] = condMatch;
            const cleanUC = useCase.trim();

            if (cleanUC && !useCases.includes(cleanUC)) {
              useCases.push(cleanUC);
              // Create a base use case for the conditional one
              const baseUC = 'Main Flow';
              if (!useCases.includes(baseUC)) useCases.push(baseUC);

              conditions.push({
                from: cleanUC,
                to: baseUC,
                condition: condition.trim(),
                type: 'extend'
              });
            }
          }
        }
      }
    });

    // If no explicit system name found, try to infer from the first line or content
    if (systemName === 'System') {
      const firstLine = lines[0]?.trim();
      if (firstLine && firstLine.length > 3 && firstLine.length < 50 &&
          !firstLine.toLowerCase().includes('actor') &&
          !firstLine.toLowerCase().includes('use case')) {
        systemName = firstLine;
      } else {
        // Try to infer from keywords in the text
        const textLower = text.toLowerCase();
        if (textLower.includes('management')) {
          systemName = 'Management System';
        } else if (textLower.includes('shopping') || textLower.includes('ecommerce')) {
          systemName = 'Shopping System';
        } else if (textLower.includes('bank') || textLower.includes('finance')) {
          systemName = 'Banking System';
        } else if (textLower.includes('hospital') || textLower.includes('health')) {
          systemName = 'Healthcare System';
        } else if (textLower.includes('library')) {
          systemName = 'Library System';
        } else if (textLower.includes('hotel') || textLower.includes('booking')) {
          systemName = 'Booking System';
        } else if (textLower.includes('school') || textLower.includes('education')) {
          systemName = 'Education System';
        } else {
          systemName = 'Application System';
        }
      }
    }

    // Enhanced extraction with fallbacks
    if (actors.length === 0) {
      const actorKeywords = ['customer', 'user', 'admin', 'manager', 'client'];
      actorKeywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword)) {
          const actor = keyword.charAt(0).toUpperCase() + keyword.slice(1);
          if (!actors.includes(actor)) actors.push(actor);
        }
      });
    }

    if (externalServices.length === 0) {
      const serviceKeywords = ['payment', 'authentication', 'database', 'api', 'gateway'];
      serviceKeywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword)) {
          const service = keyword.charAt(0).toUpperCase() + keyword.slice(1) + ' Service';
          if (!externalServices.includes(service)) externalServices.push(service);
        }
      });
    }

    if (useCases.length === 0) {
      const sentences = text.split(/[.!?\n]/).filter(s => s.trim().length > 10);
      sentences.forEach(sentence => {
        const trimmed = sentence.trim();
        if (trimmed.length > 10 && trimmed.length < 50) {
          const cleaned = trimmed.replace(/^(the|a|an)\s+/i, '').replace(/\s+/g, ' ');
          if (!useCases.includes(cleaned)) {
            useCases.push(cleaned);
          }
        }
      });
    }

    // Create relationships
    actors.forEach(actor => {
      useCases.forEach(useCase => {
        relationships.push({ actor, useCase, type: 'uses' });
      });
    });

    // Calculate dimensions
    const width = 1200;
    const height = Math.max(800, Math.max(actors.length, externalServices.length) * 120 + 200);
    const systemBoundaryX = 280;
    const systemBoundaryWidth = 640;
    const systemBoundaryY = 120;
    const systemBoundaryHeight = height - 220;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <style>
          .actor-figure { fill: none; stroke: #1e40af; stroke-width: 2.5; }
          .actor-head { fill: #1e40af; }
          .actor-text { font-family: 'Segoe UI', sans-serif; font-size: 13px; font-weight: 600; text-anchor: middle; fill: #1f2937; }
          .service-figure { fill: none; stroke: #059669; stroke-width: 2.5; }
          .service-head { fill: #059669; }
          .service-text { font-family: 'Segoe UI', sans-serif; font-size: 12px; font-weight: 600; text-anchor: middle; fill: #1f2937; }
          .usecase-bg { fill: #ffffff; stroke: #3b82f6; stroke-width: 2; filter: drop-shadow(1px 1px 3px rgba(0,0,0,0.2)); }
          .usecase-text { font-family: 'Segoe UI', sans-serif; font-size: 11px; text-anchor: middle; fill: #1f2937; font-weight: 500; }
          .title-text { font-family: 'Segoe UI', sans-serif; font-size: 20px; font-weight: 700; text-anchor: middle; fill: #111827; }
          .system-text { font-family: 'Segoe UI', sans-serif; font-size: 14px; font-weight: 600; fill: #374151; }
          .boundary-text { font-family: 'Segoe UI', sans-serif; font-size: 12px; fill: #6b7280; }
          .relationship-line { stroke: #374151; stroke-width: 1.5; }
          .extend-line { stroke: #dc2626; stroke-width: 1.5; stroke-dasharray: 8,4; marker-end: url(#extend-arrow); }
          .include-line { stroke: #059669; stroke-width: 1.5; stroke-dasharray: 4,4; marker-end: url(#include-arrow); }
          .condition-text { font-family: 'Segoe UI', sans-serif; font-size: 9px; fill: #dc2626; font-style: italic; }
          .system-boundary { fill: none; stroke: #6b7280; stroke-width: 2; stroke-dasharray: 8,4; }
          .subsystem-boundary { fill: rgba(59, 130, 246, 0.05); stroke: #3b82f6; stroke-width: 2; }
          .stereotype-text { font-family: 'Segoe UI', sans-serif; font-size: 9px; text-anchor: middle; fill: #6b7280; font-style: italic; }
        </style>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#374151"/>
        </marker>
        <marker id="extend-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#dc2626"/>
        </marker>
        <marker id="include-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#059669"/>
        </marker>
      </defs>

      <!-- Background -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="#fefefe"/>

      <!-- Title -->
      <text x="${width/2}" y="35" class="title-text">Use Case Diagram of ${systemName}</text>

      <!-- System Boundary -->
      <rect x="${systemBoundaryX}" y="${systemBoundaryY}" width="${systemBoundaryWidth}" height="${systemBoundaryHeight}"
            class="system-boundary" rx="15"/>
      <text x="${systemBoundaryX + 15}" y="${systemBoundaryY + 25}" class="boundary-text">System Boundary</text>

      <!-- Subsystem -->
      <rect x="${systemBoundaryX + 50}" y="${systemBoundaryY + 40}" width="${systemBoundaryWidth - 100}" height="120"
            class="subsystem-boundary" rx="10"/>
      <text x="${systemBoundaryX + 60}" y="${systemBoundaryY + 60}" class="stereotype-text">&lt;&lt;Subsystem&gt;&gt;</text>
      <text x="${systemBoundaryX + systemBoundaryWidth/2}" y="${systemBoundaryY + 80}" class="system-text" text-anchor="middle">${systemName}</text>`;

    // Draw actors on the left
    actors.forEach((actor, i) => {
      const x = 140;
      const y = 200 + i * 140;

      svg += `
        <!-- Actor: ${actor} -->
        <g>
          <circle cx="${x}" cy="${y}" r="12" class="actor-head"/>
          <line x1="${x}" y1="${y + 12}" x2="${x}" y2="${y + 45}" class="actor-figure"/>
          <line x1="${x - 12}" y1="${y + 25}" x2="${x + 12}" y2="${y + 25}" class="actor-figure"/>
          <line x1="${x}" y1="${y + 45}" x2="${x - 10}" y2="${y + 70}" class="actor-figure"/>
          <line x1="${x}" y1="${y + 45}" x2="${x + 10}" y2="${y + 70}" class="actor-figure"/>
          <text x="${x}" y="${y + 90}" class="actor-text">${actor}</text>
        </g>`;
    });

    // Draw external services on the right
    externalServices.forEach((service, i) => {
      const x = width - 140;
      const y = 200 + i * 140;

      svg += `
        <!-- Service: ${service} -->
        <g>
          <text x="${x}" y="${y - 20}" class="stereotype-text">&lt;&lt;Service&gt;&gt;</text>
          <circle cx="${x}" cy="${y}" r="12" class="service-head"/>
          <line x1="${x}" y1="${y + 12}" x2="${x}" y2="${y + 45}" class="service-figure"/>
          <line x1="${x - 12}" y1="${y + 25}" x2="${x + 12}" y2="${y + 25}" class="service-figure"/>
          <line x1="${x}" y1="${y + 45}" x2="${x - 10}" y2="${y + 70}" class="service-figure"/>
          <line x1="${x}" y1="${y + 45}" x2="${x + 10}" y2="${y + 70}" class="service-figure"/>
          <text x="${x}" y="${y + 90}" class="service-text">${service.length > 15 ? service.substring(0, 15) + '...' : service}</text>
        </g>`;
    });

    // Draw use cases inside system boundary
    const useCaseStartY = systemBoundaryY + 180;
    const useCaseSpacing = Math.min(100, (systemBoundaryHeight - 200) / useCases.length);

    useCases.forEach((useCase, i) => {
      const x = systemBoundaryX + systemBoundaryWidth / 2;
      const y = useCaseStartY + i * useCaseSpacing;

      // Calculate ellipse size
      const ellipseWidth = Math.max(100, Math.min(160, useCase.length * 6 + 40));
      const ellipseHeight = 40;

      svg += `
        <!-- Use Case: ${useCase} -->
        <ellipse cx="${x}" cy="${y}" rx="${ellipseWidth/2}" ry="${ellipseHeight/2}" class="usecase-bg"/>
        <text x="${x}" y="${y + 3}" class="usecase-text">
          ${useCase.length > 18 ?
            `<tspan x="${x}" dy="-5">${useCase.substring(0, 18)}</tspan>
             <tspan x="${x}" dy="12">${useCase.substring(18, 36)}${useCase.length > 36 ? '...' : ''}</tspan>` :
            useCase
          }
        </text>`;

      // Add include/extend relationships for some use cases
      if (i < useCases.length - 1) {
        const nextY = useCaseStartY + (i + 1) * useCaseSpacing;
        svg += `
          <line x1="${x}" y1="${y + ellipseHeight/2}" x2="${x}" y2="${nextY - ellipseHeight/2}"
                class="relationship-line" stroke-dasharray="3,3"/>
          <text x="${x + 20}" y="${(y + nextY)/2}" class="stereotype-text">&lt;&lt;include&gt;&gt;</text>`;
      }
    });

    // Draw relationships from actors to use cases
    relationships.slice(0, Math.min(relationships.length, actors.length * 2)).forEach((rel, index) => {
      const actorIndex = actors.indexOf(rel.actor);
      const useCaseIndex = useCases.indexOf(rel.useCase);

      if (actorIndex >= 0 && useCaseIndex >= 0) {
        const actorX = 152;
        const actorY = 200 + actorIndex * 140;
        const useCaseX = systemBoundaryX + systemBoundaryWidth / 2;
        const useCaseY = useCaseStartY + useCaseIndex * useCaseSpacing;

        // Calculate connection points
        const ellipseWidth = Math.max(100, Math.min(160, rel.useCase.length * 6 + 40));
        const connectionX = useCaseX - ellipseWidth/2;

        svg += `<line x1="${actorX}" y1="${actorY}" x2="${connectionX}" y2="${useCaseY}" class="relationship-line"/>`;
      }
    });

    // Draw relationships from use cases to external services
    if (externalServices.length > 0) {
      useCases.slice(0, 3).forEach((useCase, i) => {
        const serviceIndex = i % externalServices.length;
        const useCaseX = systemBoundaryX + systemBoundaryWidth / 2;
        const useCaseY = useCaseStartY + i * useCaseSpacing;
        const serviceX = width - 152;
        const serviceY = 200 + serviceIndex * 140;

        const ellipseWidth = Math.max(100, Math.min(160, useCase.length * 6 + 40));
        const connectionX = useCaseX + ellipseWidth/2;

        svg += `<line x1="${connectionX}" y1="${useCaseY}" x2="${serviceX}" y2="${serviceY}" class="relationship-line"/>`;
      });
    }

    // Draw conditional relationships (extend/include)
    conditions.forEach((condition, i) => {
      const fromIndex = useCases.indexOf(condition.from);
      const toIndex = useCases.indexOf(condition.to);

      if (fromIndex >= 0 && toIndex >= 0) {
        const fromCol = fromIndex % useCaseColumns;
        const fromRow = Math.floor(fromIndex / useCaseColumns);
        const fromX = systemBoundaryX + systemBoundaryWidth / 2;
        const fromY = useCaseStartY + fromIndex * useCaseSpacing;

        const toCol = toIndex % useCaseColumns;
        const toRow = Math.floor(toIndex / useCaseColumns);
        const toX = systemBoundaryX + systemBoundaryWidth / 2;
        const toY = useCaseStartY + toIndex * useCaseSpacing;

        // Calculate curved line for better visibility
        const midX = (fromX + toX) / 2 + (i % 2 === 0 ? 50 : -50);
        const midY = (fromY + toY) / 2;

        const lineClass = condition.type === 'extend' ? 'extend-line' : 'include-line';
        const lineColor = condition.type === 'extend' ? '#dc2626' : '#059669';

        // Draw curved relationship line
        svg += `
          <path d="M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}"
                fill="none" class="${lineClass}"/>

          <!-- Stereotype label -->
          <text x="${midX}" y="${midY - 15}" class="stereotype-text">
            &lt;&lt;${condition.type}&gt;&gt;
          </text>

          <!-- Condition text -->
          <text x="${midX}" y="${midY - 5}" class="condition-text">
            {${condition.condition.length > 25 ? condition.condition.substring(0, 25) + '...' : condition.condition}}
          </text>`;
      }
    });

    // Add conditions legend if there are any conditions
    if (conditions.length > 0) {
      svg += `
        <!-- Conditions Legend -->
        <g transform="translate(220, ${height - 80})">
          <rect x="0" y="0" width="250" height="70" fill="white" stroke="#d1d5db" rx="5"/>
          <text x="10" y="20" class="subtitle-text" text-anchor="start" font-weight="600">Conditional Relationships:</text>

          <!-- Extend example -->
          <line x1="15" y1="35" x2="45" y2="35" class="extend-line"/>
          <text x="50" y="39" class="subtitle-text" text-anchor="start">&lt;&lt;extend&gt;&gt; {condition}</text>

          <!-- Include example -->
          <line x1="15" y1="55" x2="45" y2="55" class="include-line"/>
          <text x="50" y="59" class="subtitle-text" text-anchor="start">&lt;&lt;include&gt;&gt; {condition}</text>
        </g>`;
    }

    svg += '</svg>';
    return svg;
  }, []);

  const generateSequenceDiagram = useCallback((text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const participants: string[] = [];
    const messages: Array<{from: string, to: string, message: string, type: 'call' | 'return', number: number}> = [];

    // Extract participants
    lines.forEach(line => {
      const cleanLine = line.trim();

      // Extract explicit participants
      if (cleanLine.toLowerCase().includes('participant')) {
        const participant = line.trim().replace(/^participant:?\s*/i, '');
        if (participant && !participants.includes(participant)) {
          participants.push(participant);
        }
      }

      // Extract from message patterns
      if (cleanLine.includes('->')) {
        const parts = cleanLine.split('->');
        if (parts.length >= 2) {
          const from = parts[0].trim();
          const toPart = parts[1].split(':')[0].trim();

          if (from && !participants.includes(from)) participants.push(from);
          if (toPart && !participants.includes(toPart)) participants.push(toPart);
        }
      }
    });

    // Fallback extraction
    if (participants.length === 0) {
      const commonParticipants = ['User', 'Device', 'Database', 'Server', 'System', 'API', 'Client'];
      commonParticipants.forEach(p => {
        if (text.toLowerCase().includes(p.toLowerCase())) {
          if (!participants.includes(p)) participants.push(p);
        }
      });
    }

    // Extract messages
    let messageCounter = 1;
    lines.forEach(line => {
      if (line.includes('->')) {
        const parts = line.split('->');
        if (parts.length >= 2) {
          const from = parts[0].trim();
          const toPart = parts[1].trim();
          const to = toPart.split(':')[0].trim();
          const message = toPart.includes(':') ? toPart.split(':').slice(1).join(':').trim() : toPart;

          if (from && to && message) {
            messages.push({
              from,
              to,
              message,
              type: 'call',
              number: messageCounter++
            });
          }
        }
      }
    });

    // Smart dimension calculation for large datasets
    const minParticipantWidth = 150;
    const maxParticipantWidth = 200;
    const participantWidth = Math.min(maxParticipantWidth, Math.max(minParticipantWidth, 800 / Math.max(participants.length, 1)));

    const width = Math.max(800, participants.length * participantWidth + 100);
    const messageSpacing = Math.max(50, Math.min(80, 600 / Math.max(messages.length, 1)));
    const height = Math.max(600, messages.length * messageSpacing + 300);

    const participantY = 100;
    const participantSpacing = (width - 100) / (participants.length + 1);

    // Ensure minimum readable size but cap maximum for performance
    const maxWidth = 1800;
    const maxHeight = 1500;
    const finalWidth = Math.min(width, maxWidth);
    const finalHeight = Math.min(height, maxHeight);

    let svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${finalWidth} ${finalHeight}">
      <defs>
        <style>
          .participant-box {
            fill: #ffffff;
            stroke: #333333;
            stroke-width: 2;
          }
          .participant-text {
            font-family: Arial, sans-serif;
            font-size: ${participants.length > 6 ? '12px' : '14px'};
            font-weight: normal;
            text-anchor: middle;
            fill: #333333;
          }
          .lifeline {
            stroke: #333333;
            stroke-width: 1;
            stroke-dasharray: ${messageSpacing > 60 ? '8,4' : '5,5'};
          }
          .activation-box {
            fill: #ffffff;
            stroke: #333333;
            stroke-width: 1;
          }
          .message-line {
            stroke: #008000;
            stroke-width: 1.5;
            marker-end: url(#arrow);
          }
          .return-line {
            stroke: #008000;
            stroke-width: 1;
            stroke-dasharray: 5,3;
            marker-end: url(#arrow);
          }
          .message-text {
            font-family: Arial, sans-serif;
            font-size: ${messages.length > 10 ? '10px' : '12px'};
            fill: #008000;
            font-weight: normal;
          }
          .title-text {
            font-family: Arial, sans-serif;
            font-size: 16px;
            font-weight: bold;
            text-anchor: start;
            fill: #333333;
          }
          .number-text {
            font-family: Arial, sans-serif;
            font-size: ${messages.length > 10 ? '9px' : '11px'};
            font-weight: normal;
            fill: #008000;
          }
        </style>

        <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#008000"/>
        </marker>
      </defs>

      <!-- Background -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="#f5f5f5"/>

      <!-- Title -->
      <rect x="10" y="10" width="200" height="25" fill="#d0d0d0" stroke="#999999"/>
      <text x="15" y="27" class="title-text">Example sequence diagram</text>`;

    // Draw participants with smart sizing
    participants.forEach((participant, i) => {
      const x = 50 + participantSpacing * (i + 1);
      const maxBoxWidth = participantWidth - 20;
      const minBoxWidth = 80;
      const boxWidth = Math.min(maxBoxWidth, Math.max(minBoxWidth, participant.length * 8 + 20));

      // Truncate participant name if too long
      const displayName = participant.length > 15 ? participant.substring(0, 15) + '...' : participant;

      svg += `
        <!-- Participant: ${participant} -->
        <rect x="${x - boxWidth/2}" y="${participantY}" width="${boxWidth}" height="35" class="participant-box"/>
        <text x="${x}" y="${participantY + 22}" class="participant-text">${displayName}</text>
        <!-- Lifeline -->
        <line x1="${x}" y1="${participantY + 35}" x2="${x}" y2="${height - 50}" class="lifeline"/>`;
    });

    // Draw messages with smart spacing and layout
    messages.forEach((msg, i) => {
      const fromIndex = participants.findIndex(p =>
        p.toLowerCase() === msg.from.toLowerCase() ||
        msg.from.toLowerCase().includes(p.toLowerCase()) ||
        p.toLowerCase().includes(msg.from.toLowerCase())
      );
      const toIndex = participants.findIndex(p =>
        p.toLowerCase() === msg.to.toLowerCase() ||
        msg.to.toLowerCase().includes(p.toLowerCase()) ||
        p.toLowerCase().includes(msg.to.toLowerCase())
      );

      if (fromIndex >= 0 && toIndex >= 0) {
        const fromX = 50 + participantSpacing * (fromIndex + 1);
        const toX = 50 + participantSpacing * (toIndex + 1);
        const y = 180 + i * messageSpacing;

        // Activation box on target with proper height
        const activationHeight = Math.min(messageSpacing - 10, 30);
        svg += `<rect x="${toX - 6}" y="${y - activationHeight/2}" width="12" height="${activationHeight}" class="activation-box"/>`;

        // Message line with proper direction
        const lineEndX = fromX < toX ? toX - 6 : toX + 6;
        svg += `<line x1="${fromX}" y1="${y}" x2="${lineEndX}" y2="${y}" class="message-line"/>`;

        // Message number positioned to avoid overlap
        const numberX = Math.min(fromX, toX) + 15;
        svg += `<text x="${numberX}" y="${y - 12}" class="number-text">${msg.number}:</text>`;

        // Message text with smart positioning and length control
        const textX = Math.min(fromX, toX) + 35;
        const availableWidth = Math.abs(toX - fromX) - 70;
        const maxChars = Math.max(15, Math.floor(availableWidth / 6));
        const messageText = msg.message.length > maxChars ? msg.message.substring(0, maxChars) + '...' : msg.message;

        svg += `<text x="${textX}" y="${y - 12}" class="message-text">${messageText}</text>`;

        // Add return message only for longer interactions to avoid clutter
        if (i < messages.length - 1 && messages.length <= 8 && i % 3 === 0) {
          const returnY = y + messageSpacing * 0.4;
          const returnLineStartX = fromX < toX ? toX - 6 : toX + 6;
          svg += `<line x1="${returnLineStartX}" y1="${returnY}" x2="${fromX}" y2="${returnY}" class="return-line"/>`;

          const returnNumberX = Math.min(fromX, toX) + 15;
          svg += `<text x="${returnNumberX}" y="${returnY - 8}" class="number-text">${msg.number}.1:</text>`;
          svg += `<text x="${returnNumberX + 25}" y="${returnY - 8}" class="message-text">Response</text>`;
        }
      }
    });

    // Add overflow indicator if content was truncated
    const isOverflowing = width > maxWidth || height > maxHeight;

    // Add watermark-style footer
    svg += `
      <rect x="10" y="${finalHeight - 40}" width="300" height="25" fill="#d0d0d0" stroke="#999999"/>
      <text x="15" y="${finalHeight - 23}" class="title-text">Sequence Diagrams</text>
      <text x="${finalWidth - 50}" y="${finalHeight - 23}" class="title-text">∞</text>`;

    // Add scroll indicator if content overflows
    if (isOverflowing) {
      svg += `
        <rect x="${finalWidth - 200}" y="10" width="180" height="20" fill="#ffeb3b" stroke="#ffc107" rx="3"/>
        <text x="${finalWidth - 110}" y="23" style="font-family: Arial; font-size: 11px; text-anchor: middle; fill: #333;">
          Large dataset - scroll to view all
        </text>`;
    }

    // Add summary info for large datasets
    if (participants.length > 4 || messages.length > 8) {
      svg += `
        <rect x="10" y="40" width="250" height="20" fill="#e3f2fd" stroke="#2196f3" rx="3"/>
        <text x="15" y="53" style="font-family: Arial; font-size: 11px; fill: #1976d2;">
          ${participants.length} participants, ${messages.length} messages
        </text>`;
    }

    svg += '</svg>';
    return svg;
  }, []);

  const generateDiagram = useCallback(async () => {
    if (!textInput.trim()) {
      showStatus('Please enter some text to generate a diagram', 'error');
      return;
    }

    setIsGenerating(true);
    showStatus('Generating UML diagram...', 'warning');

    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      let svg: string;
      if (diagramType === 'usecase') {
        svg = generateUseCaseDiagram(textInput);
      } else {
        svg = generateSequenceDiagram(textInput);
      }

      setDiagramData({
        type: diagramType,
        content: textInput,
        svg: svg
      });

      showStatus(`${diagramType === 'usecase' ? 'Use Case' : 'Sequence'} diagram generated successfully!`, 'success');
    } catch (error) {
      showStatus('Failed to generate diagram. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [textInput, diagramType, generateUseCaseDiagram, generateSequenceDiagram, showStatus]);

  const downloadSVG = useCallback(() => {
    if (!diagramData) return;

    const blob = new Blob([diagramData.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${diagramType}-diagram-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showStatus('Diagram downloaded successfully!', 'success');
  }, [diagramData, diagramType, showStatus]);

  const copyToClipboard = useCallback(() => {
    if (!diagramData) return;
    
    navigator.clipboard.writeText(diagramData.svg).then(() => {
      showStatus('SVG code copied to clipboard!', 'success');
    }).catch(() => {
      showStatus('Failed to copy to clipboard', 'error');
    });
  }, [diagramData, showStatus]);

  const loadSampleText = useCallback((type: 'usecase' | 'sequence') => {
    if (type === 'usecase') {
      setTextInput(`Online Shopping System

Actor: Customer
Actor: Admin
Actor: Payment System

Use Case: Browse Products
Use Case: Add to Cart
Use Case: Checkout
Use Case: Make Payment
Use Case: Manage Inventory
Use Case: Process Orders
Use Case: Apply Discount
Use Case: Verify Identity

The customer can browse products and add items to cart.
The customer can checkout and make payment through payment system.
The admin can manage inventory and process orders.

Apply Discount extends Checkout if customer has coupon code
Verify Identity extends Make Payment when payment amount exceeds $500
Process Orders includes Manage Inventory if stock is low`);
    } else {
      setTextInput(`User Login Process

Participant: User
Participant: Web Server
Participant: Database
Participant: Authentication Service

User -> Web Server: Enter credentials
Web Server -> Authentication Service: Validate credentials
Authentication Service -> Database: Check user data
Database -> Authentication Service: Return user info
Authentication Service -> Web Server: Authentication result
Web Server -> User: Login response`);
    }
    setDiagramType(type);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px 0'
    }}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/dashboard" className="flex items-center text-white hover:text-white/80 transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <GitBranch className="h-8 w-8" />
            Text to UML Diagram
          </h1>
          <div></div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            statusMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            statusMessage.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-yellow-100 text-yellow-800 border border-yellow-200'
          }`}>
            {statusMessage.message}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-600" />
                Diagram Input
              </CardTitle>
              <CardDescription>
                Describe your system or process in text to generate UML diagrams
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Diagram Type Selection */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Diagram Type</Label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setDiagramType('usecase')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      diagramType === 'usecase'
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Users className="h-5 w-5 mx-auto mb-2" />
                    <div className="font-medium">Use Case</div>
                    <div className="text-sm opacity-75">Actors & Functions</div>
                  </button>
                  <button
                    onClick={() => setDiagramType('sequence')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      diagramType === 'sequence'
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <ArrowRight className="h-5 w-5 mx-auto mb-2" />
                    <div className="font-medium">Sequence</div>
                    <div className="text-sm opacity-75">Interactions</div>
                  </button>
                </div>
              </div>

              {/* Text Input */}
              <div>
                <Label htmlFor="diagram-text" className="text-sm font-medium mb-3 block">
                  Description
                </Label>
                <Textarea
                  id="diagram-text"
                  placeholder={diagramType === 'usecase' 
                    ? "Describe actors, use cases, and their relationships...\n\nExample:\nActor: Customer\nActor: System\nUse Case: Login\nThe customer can login to the system..."
                    : "Describe participants and their interactions...\n\nExample:\nUser -> System: Login request\nSystem -> Database: Validate credentials\nDatabase -> System: Return result..."
                  }
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="min-h-[300px] resize-none"
                />
              </div>

              {/* Sample Data Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSampleText('usecase')}
                  className="flex-1"
                >
                  Load Use Case Sample
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSampleText('sequence')}
                  className="flex-1"
                >
                  Load Sequence Sample
                </Button>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateDiagram}
                disabled={isGenerating || !textInput.trim()}
                className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Generating Diagram...
                  </>
                ) : (
                  <>
                    <GitBranch className="h-5 w-5 mr-2" />
                    Generate {diagramType === 'usecase' ? 'Use Case' : 'Sequence'} Diagram
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Diagram Display Section */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-cyan-600" />
                Generated Diagram
              </CardTitle>
              <CardDescription>
                Your UML diagram will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!diagramData ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <GitBranch className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">No diagram generated yet</p>
                  <p className="text-sm">Enter text and click generate to create your UML diagram</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Diagram Display */}
                  <div 
                    ref={diagramRef}
                    className="border rounded-lg bg-white p-4 overflow-auto"
                    style={{ maxHeight: '500px' }}
                    dangerouslySetInnerHTML={{ __html: diagramData.svg }}
                  />
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={downloadSVG}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download SVG
                    </Button>
                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy SVG
                    </Button>
                  </div>
                  
                  {/* Diagram Info */}
                  <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                    <strong>Type:</strong> {diagramData.type === 'usecase' ? 'Use Case Diagram' : 'Sequence Diagram'}<br/>
                    <strong>Generated:</strong> {new Date().toLocaleString()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
