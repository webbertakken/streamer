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
      <span className={editMode ? "" : "bg-black/60 rounded px-2 py-0.5"}>{config.text}</span>
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
