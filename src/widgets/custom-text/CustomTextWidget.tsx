import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { useOverlayStore } from "../../stores/overlay";

export interface CustomTextConfig {
  text: string;
  fontSize: number;
  colour: string;
  fontFamily: string;
  textAlign: CanvasTextAlign;
}

function CustomTextContent({ instanceId }: { instanceId: string }) {
  const instance = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId));
  const editMode = useOverlayStore((s) => s.editMode);
  const config = instance?.config as CustomTextConfig | undefined;
  if (!config) return null;

  return (
    <div
      className="h-full flex items-center justify-center p-2"
      style={{
        fontSize: config.fontSize,
        color: config.colour,
        fontFamily: config.fontFamily,
        textAlign: config.textAlign,
      }}
    >
      <span className={`px-2 py-0.5 ${editMode ? "" : "bg-black/30 rounded"}`}>{config.text}</span>
    </div>
  );
}

export function CustomTextSettings({ instanceId }: { instanceId: string }) {
  const instance = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId));
  const updateInstance = useOverlayStore((s) => s.updateInstance);
  const config = (instance?.config ?? {}) as unknown as CustomTextConfig;

  function update(partial: Partial<CustomTextConfig>) {
    updateInstance(instanceId, { config: { ...config, ...partial } });
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-white/60 block mb-0.5">Text</label>
        <input
          type="text"
          value={config.text ?? ""}
          onChange={(e) => update({ text: e.target.value })}
          className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-white/60 block mb-0.5">Size</label>
          <input
            type="number"
            value={config.fontSize ?? 24}
            onChange={(e) => update({ fontSize: Number(e.target.value) || 24 })}
            min={8}
            max={200}
            className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-white/60 block mb-0.5">Colour</label>
          <input
            type="color"
            value={config.colour ?? "#ffffff"}
            onChange={(e) => update({ colour: e.target.value })}
            className="w-full h-7 bg-white/10 rounded cursor-pointer"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-white/60 block mb-0.5">Font</label>
        <select
          value={config.fontFamily ?? "sans-serif"}
          onChange={(e) => update({ fontFamily: e.target.value })}
          className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="sans-serif">Sans-serif</option>
          <option value="serif">Serif</option>
          <option value="monospace">Monospace</option>
          <option value="cursive">Cursive</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-white/60 block mb-0.5">Align</label>
        <select
          value={config.textAlign ?? "center"}
          onChange={(e) => update({ textAlign: e.target.value as CanvasTextAlign })}
          className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="left">Left</option>
          <option value="center">Centre</option>
          <option value="right">Right</option>
        </select>
      </div>
    </div>
  );
}

export function CustomTextWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Custom text">
      <div className="h-full">
        <CustomTextContent instanceId={instanceId} />
      </div>
    </Widget>
  );
}
