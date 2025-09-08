// MultipleFiles/chart.tsx
import * as React from "react";
import * as RechartsPrimitive from "recharts";

/**
 * Utility function to merge CSS class names with Tailwind CSS conflict resolution
 */
function cn(...inputs: (string | undefined | null | false | { [key: string]: boolean })[]): string {
  const classes: string[] = [];

  inputs.forEach(input => {
    if (typeof input === 'string' && input) {
      classes.push(input);
    } else if (input && typeof input === 'object') {
      Object.entries(input).forEach(([key, value]) => {
        if (value) classes.push(key);
      });
    }
  });

  return classes.join(' ');
}

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "Chart";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([_, config]) => config.theme || config.color,
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref,
  ) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      const key = `${labelKey || item.dataKey || item.name || "value"}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        );
      }

      if (!value) {
        return null;
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>;
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      config,
      labelKey,
    ]);

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== "dot";

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className,
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color || item.payload.fill || item.color;

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center",
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                              "my-0.5": nestLabel && indicator === "dashed",
                            },
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center",
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value && (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltip";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref,
  ) => {
    const { config } = useChart();

    if (!payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className,
        )}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground",
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          );
        })}
      </div>
    );
  },
);
ChartLegendContent.displayName = "ChartLegend";

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string;
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config];
}

// ER Diagram Components
interface EREntity {
  id: string;
  name: string;
  attributes: ERAttribute[];
  x: number;
  y: number;
}

interface ERAttribute {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

interface ERRelationship {
  id: string;
  fromEntity: string;
  toEntity: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  label?: string;
}

interface ERDiagramProps {
  entities: EREntity[];
  relationships: ERRelationship[];
  className?: string;
  width?: number;
  height?: number;
}

const ERDiagram = React.forwardRef<
  SVGSVGElement,
  ERDiagramProps
>(({ entities, relationships, className, width = 800, height = 600 }, ref) => {
  const [draggedEntity, setDraggedEntity] = React.useState<string | null>(null);
  const [entityPositions, setEntityPositions] = React.useState<Record<string, { x: number, y: number }>>(() =>
    entities.reduce((acc, entity) => ({
      ...acc,
      [entity.id]: { x: entity.x, y: entity.y }
    }), {})
  );

  // Memoize initial entity positions to prevent re-calculation on every render
  React.useEffect(() => {
    setEntityPositions(
      entities.reduce((acc, entity) => ({
        ...acc,
        [entity.id]: { x: entity.x, y: entity.y }
      }), {})
    );
  }, [entities]); // Recalculate only if entities array changes

  const handleMouseDown = React.useCallback((entityId: string, e: React.MouseEvent) => {
    setDraggedEntity(entityId);
    e.preventDefault();
  }, []);

  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!draggedEntity) return;

    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setEntityPositions(prev => {
      // Only update if position actually changes to avoid unnecessary re-renders
      const newX = Math.max(0, Math.min(x, width - 200));
      const newY = Math.max(0, Math.min(y, height - 100));
      if (prev[draggedEntity]?.x === newX && prev[draggedEntity]?.y === newY) {
        return prev;
      }
      return {
        ...prev,
        [draggedEntity]: { x: newX, y: newY }
      };
    });
  }, [draggedEntity, width, height]);

  const handleMouseUp = React.useCallback(() => {
    setDraggedEntity(null);
  }, []);

  // Memoize the drawRelationship function to prevent re-creation on every render
  const drawRelationship = React.useCallback((rel: ERRelationship) => {
    const fromEntity = entities.find(e => e.id === rel.fromEntity);
    const toEntity = entities.find(e => e.id === rel.toEntity);

    if (!fromEntity || !toEntity) return null;

    const fromPos = entityPositions[rel.fromEntity];
    const toPos = entityPositions[rel.toEntity];

    // Ensure positions are valid before proceeding
    if (!fromPos || !toPos) return null;

    const fromX = fromPos.x + 100; // Center of entity box
    const fromY = fromPos.y + 50;
    const toX = toPos.x + 100;
    const toY = toPos.y + 50;

    // Calculate connection points
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    const fromConnectX = fromX + Math.cos(angle) * 100;
    const fromConnectY = fromY + Math.sin(angle) * 30;
    const toConnectX = toX - Math.cos(angle) * 100;
    const toConnectY = toY - Math.sin(angle) * 30;

    let relationshipSymbol = '';
    switch (rel.type) {
      case 'one-to-one':
        relationshipSymbol = '1:1';
        break;
      case 'one-to-many':
        relationshipSymbol = '1:M';
        break;
      case 'many-to-many':
        relationshipSymbol = 'M:N';
        break;
    }

    return (
      <g key={rel.id}>
        <line
          x1={fromConnectX}
          y1={fromConnectY}
          x2={toConnectX}
          y2={toConnectY}
          stroke="#64748b"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
        />
        <text
          x={(fromConnectX + toConnectX) / 2}
          y={(fromConnectY + toConnectY) / 2 - 10}
          fill="#475569"
          fontSize="12"
          textAnchor="middle"
          className="font-medium"
        >
          {relationshipSymbol}
        </text>
        {rel.label && (
          <text
            x={(fromConnectX + toConnectX) / 2}
            y={(fromConnectY + toConnectY) / 2 + 15}
            fill="#64748b"
            fontSize="10"
            textAnchor="middle"
          >
            {rel.label}
          </text>
        )}
      </g>
    );
  }, [entities, entityPositions]); // Dependencies for memoization

  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      className={cn("border border-border rounded-lg bg-background", className)}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#64748b"
          />
        </marker>
      </defs>

      {/* Draw relationships first (behind entities) */}
      {relationships.map(drawRelationship)}

      {/* Draw entities */}
      {entities.map((entity) => {
        const pos = entityPositions[entity.id];
        // Only render if position exists (should always for valid entities)
        if (!pos) return null;

        return (
          <g
            key={entity.id}
            transform={`translate(${pos.x}, ${pos.y})`}
            className="cursor-move"
            onMouseDown={(e) => handleMouseDown(entity.id, e)}
          >
            {/* Entity box */}
            <rect
              width="200"
              height={Math.max(100, 30 + entity.attributes.length * 20)}
              fill="#ffffff"
              stroke="#0f766e"
              strokeWidth="2"
              rx="8"
              className="drop-shadow-md"
            />

            {/* Entity name */}
            <rect
              width="200"
              height="30"
              fill="#0f766e"
              rx="8"
            />
            <rect
              width="200"
              height="30"
              fill="#0f766e"
              rx="0"
              ry="0"
            />
            <text
              x="100"
              y="20"
              fill="white"
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
              className="font-bold"
            >
              {entity.name.toUpperCase()}
            </text>

            {/* Attributes */}
            {entity.attributes.map((attr, index) => (
              <g key={index}>
                <text
                  x="10"
                  y={50 + index * 20}
                  fill={attr.isPrimaryKey ? "#dc2626" : attr.isForeignKey ? "#ea580c" : "#1e293b"}
                  fontSize="12"
                  fontWeight={attr.isPrimaryKey ? "bold" : "normal"}
                  className={attr.isPrimaryKey ? "font-bold" : ""}
                >
                  {attr.isPrimaryKey && "🔑 "}
                  {attr.isForeignKey && "🔗 "}
                  {attr.name}
                </text>
                <text
                  x="190"
                  y={50 + index * 20}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                >
                  {attr.type}
                </text>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
});
ERDiagram.displayName = "ERDiagram";

// Mermaid ER Diagram Component
interface MermaidERDiagramProps {
  mermaidCode: string;
  className?: string;
  width?: number;
  height?: number;
}

const MermaidERDiagram = React.forwardRef<
  HTMLDivElement,
  MermaidERDiagramProps
>(({ mermaidCode, className, width = 800, height = 600 }, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const mermaidInitialized = React.useRef(false); // To ensure mermaid.initialize is called only once

  React.useEffect(() => {
    // Load Mermaid script if not already loaded
    if (typeof window !== 'undefined' && !(window as any).mermaid) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.4.0/mermaid.min.js';
      script.onload = () => {
        if (!mermaidInitialized.current) {
          (window as any).mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            themeVariables: {
              primaryColor: '#0f766e',
              primaryTextColor: '#1e293b',
              primaryBorderColor: '#14b8a6',
              lineColor: '#64748b',
              sectionBkgColor: '#f1f5f9',
              altSectionBkgColor: '#e2e8f0',
              gridColor: '#cbd5e1',
              secondaryColor: '#ecfccb',
              tertiaryColor: '#fef3c7'
            }
          });
          mermaidInitialized.current = true;
        }
        setIsLoaded(true);
      };
      script.onerror = () => {
        console.error("Failed to load Mermaid script.");
        // Optionally, set an error state or display a message
      };
      document.head.appendChild(script);
    } else if ((window as any).mermaid) {
      if (!mermaidInitialized.current) {
        (window as any).mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          themeVariables: {
            primaryColor: '#0f766e',
            primaryTextColor: '#1e293b',
            primaryBorderColor: '#14b8a6',
            lineColor: '#64748b',
            sectionBkgColor: '#f1f5f9',
            altSectionBkgColor: '#e2e8f0',
            gridColor: '#cbd5e1',
            secondaryColor: '#ecfccb',
            tertiaryColor: '#fef3c7'
          }
        });
        mermaidInitialized.current = true;
      }
      setIsLoaded(true);
    }
  }, []);

  // Debounce rendering to prevent excessive calls if mermaidCode changes rapidly
  const debouncedRender = React.useCallback(
    debounce(async (code: string, element: HTMLDivElement) => {
      try {
        element.innerHTML = ''; // Clear previous SVG
        const { svg } = await (window as any).mermaid.render(`mermaid-${Date.now()}`, code);
        element.innerHTML = svg;
      } catch (error) {
        console.error('Error rendering Mermaid diagram:', error);
        element.innerHTML = '<div class="text-red-500 p-4">Error rendering diagram</div>';
      }
    }, 300), // 300ms debounce time
    []
  );

  React.useEffect(() => {
    if (isLoaded && mermaidCode && containerRef.current) {
      debouncedRender(mermaidCode, containerRef.current);
    }
  }, [isLoaded, mermaidCode, debouncedRender]);

  return (
    <div
      ref={ref}
      className={cn("border border-border rounded-lg bg-background overflow-auto", className)}
      style={{ width, height }}
    >
      <div ref={containerRef} className="flex items-center justify-center min-h-full">
        {!isLoaded && (
          <div className="text-muted-foreground">Loading diagram...</div>
        )}
      </div>
    </div>
  );
});
MermaidERDiagram.displayName = "MermaidERDiagram";

// Utility function for debouncing
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function(this: any, ...args: Parameters<T>): void {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

// Utility function to parse Mermaid ER diagram code to entity structure
const parseMermaidToEntities = (mermaidCode: string): { entities: EREntity[], relationships: ERRelationship[] } => {
  const lines = mermaidCode.split('\n').filter(line => line.trim() && !line.trim().startsWith('erDiagram'));
  const entities: EREntity[] = [];
  const relationships: ERRelationship[] = [];
  let currentEntity: EREntity | null = null;

  // Use a Map for efficient entity lookup by name
  const entityMap = new Map<string, EREntity>();

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Check if it's an entity definition
    if (trimmedLine.match(/^\w+\s*\{/)) {
      const entityName = trimmedLine.replace(/\s*\{.*/, '').trim();
      const entityId = entityName.toLowerCase();
      currentEntity = {
        id: entityId,
        name: entityName,
        attributes: [],
        x: 50 + (entities.length % 3) * 250, // Simple layout for initial positions
        y: 50 + Math.floor(entities.length / 3) * 200
      };
      entities.push(currentEntity);
      entityMap.set(entityId, currentEntity);
    }
    // Check if it's an attribute
    else if (currentEntity && trimmedLine.match(/^\w+\s+\w+(\s+(PK|FK))?/)) {
      const parts = trimmedLine.split(/\s+/);
      if (parts.length >= 2) {
        const attribute: ERAttribute = {
          name: parts[1],
          type: parts[0],
          isPrimaryKey: parts.includes('PK'),
          isForeignKey: parts.includes('FK')
        };
        currentEntity.attributes.push(attribute);
      }
    }
    // Check if it's end of entity
    else if (trimmedLine === '}') {
      currentEntity = null;
    }
    // Check if it's a relationship
    else if (trimmedLine.includes('||--') || trimmedLine.includes('}|--')) {
      // Regex to capture entity names and relationship symbol, and optional label
      const relationshipMatch = trimmedLine.match(/(\w+)\s+([|<]?-{1,2}[|o]?)\s+(\w+)\s*:\s*"?([^"]*)"?/);
      if (relationshipMatch) {
        const [, fromEntityName, relationSymbol, toEntityName, label] = relationshipMatch;
        const fromEntityId = fromEntityName.toLowerCase();
        const toEntityId = toEntityName.toLowerCase();

        let type: 'one-to-one' | 'one-to-many' | 'many-to-many' = 'one-to-many'; // Default

        // Determine relationship type based on Mermaid syntax
        if (relationSymbol.includes('||--||')) {
          type = 'one-to-one';
        } else if (relationSymbol.includes('}|--||') || relationSymbol.includes('||--o{')) {
          type = 'many-to-many'; // Mermaid uses }|--|| for M:N, or ||--o{ for 1:M (crow's foot)
        } else if (relationSymbol.includes('||--o|') || relationSymbol.includes('||--|{')) {
          type = 'one-to-many'; // Example: ||--o| for 1:M
        }

        // Ensure entities exist before adding relationship
        if (entityMap.has(fromEntityId) && entityMap.has(toEntityId)) {
          relationships.push({
            id: `${fromEntityId}-${toEntityId}-${index}`, // Unique ID for keying
            fromEntity: fromEntityId,
            toEntity: toEntityId,
            type,
            label: label || undefined // Use undefined if label is empty string
          });
        } else {
          console.warn(`Skipping relationship due to missing entity: ${fromEntityName} or ${toEntityName}`);
        }
      }
    }
  });

  return { entities, relationships };
};

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ERDiagram,
  MermaidERDiagram,
  parseMermaidToEntities,
  type EREntity,
  type ERAttribute,
  type ERRelationship,
  type ERDiagramProps,
  type MermaidERDiagramProps
};

