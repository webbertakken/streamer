import type { ComponentType } from "react";

export interface WidgetInstanceProps {
  instanceId: string;
}

export interface WidgetDefaults {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WidgetDefinition {
  /** Unique identifier for the widget type */
  id: string;
  /** Display name shown in the UI */
  name: string;
  /** The React component to render */
  component: ComponentType<WidgetInstanceProps>;
  /** Default position and size */
  defaults: WidgetDefaults;
  /** When true, only one instance of this widget type can exist */
  singleton?: boolean;
  /** Default config for new instances of this widget type */
  defaultConfig?: Record<string, unknown>;
  /** Optional settings component rendered in the per-widget settings popover */
  settingsComponent?: ComponentType<{ instanceId: string }>;
}

const widgets = new Map<string, WidgetDefinition>();

/** Register a widget with the registry */
export function registerWidget(definition: WidgetDefinition): void {
  widgets.set(definition.id, definition);
}

/** Get all registered widgets */
export function getWidgets(): WidgetDefinition[] {
  return Array.from(widgets.values());
}

/** Get a widget by id */
export function getWidget(id: string): WidgetDefinition | undefined {
  return widgets.get(id);
}

/* Register all built-in widgets */
import { ChatWidget } from "./chat/ChatWidget";
import { ViewerCountWidget } from "./viewer-count/ViewerCountWidget";
import { FollowerAlertWidget } from "./follower-alerts/FollowerAlertWidget";
import { EventFeedWidget } from "./event-feed/EventFeedWidget";
import { CustomTextWidget, CustomTextSettings } from "./custom-text/CustomTextWidget";
import { ChatPresenceWidget } from "./chat-presence/ChatPresenceWidget";
import { FollowEventsWidget } from "./follow-events/FollowEventsWidget";
import { EventLogWidget } from "./event-log/EventLogWidget";
import { RaidAlertWidget } from "./raid-alerts/RaidAlertWidget";
import { SubAlertWidget } from "./subscription-alerts/SubAlertWidget";
import { StreamInfoWidget, StreamInfoSettings } from "./stream-info/StreamInfoWidget";

registerWidget({ id: "chat", name: "Chat", component: ChatWidget, singleton: true, defaults: { x: 8, y: 840, width: 416, height: 296 } });
registerWidget({ id: "viewer-count", name: "Viewer count", component: ViewerCountWidget, singleton: true, defaults: { x: 1192, y: 24, width: 200, height: 64 } });
registerWidget({ id: "follower-alerts", name: "Follower alerts", component: FollowerAlertWidget, singleton: true, defaults: { x: 1112, y: 1000, width: 352, height: 120 } });
registerWidget({ id: "event-feed", name: "Event feed", component: EventFeedWidget, singleton: true, defaults: { x: 2256, y: 896, width: 296, height: 272 } });
registerWidget({ id: "custom-text", name: "Custom text", component: CustomTextWidget, defaults: { x: 1024, y: 96, width: 544, height: 48 }, defaultConfig: { text: "Welcome to the stream!", fontSize: 24, colour: "#ffffff", fontFamily: "sans-serif", textAlign: "center" }, settingsComponent: CustomTextSettings });
registerWidget({ id: "chat-presence", name: "Chat presence", component: ChatPresenceWidget, singleton: true, defaults: { x: 2392, y: 48, width: 152, height: 568 } });
registerWidget({ id: "follow-events", name: "Follow events", component: FollowEventsWidget, singleton: true, defaults: { x: 2256, y: 648, width: 296, height: 224 } });
registerWidget({ id: "event-log", name: "Event log", component: EventLogWidget, singleton: true, defaults: { x: 8, y: 1168, width: 416, height: 216 } });
registerWidget({ id: "raid-alerts", name: "Raid alerts", component: RaidAlertWidget, singleton: true, defaults: { x: 1112, y: 880, width: 352, height: 120 } });
registerWidget({ id: "subscription-alerts", name: "Subscription alerts", component: SubAlertWidget, singleton: true, defaults: { x: 1112, y: 760, width: 352, height: 120 } });
registerWidget({ id: "stream-info", name: "Stream info", component: StreamInfoWidget, defaults: { x: 1192, y: 96, width: 304, height: 152 }, defaultConfig: { showTitle: true, showGame: true, showUptime: true, showViewers: false }, settingsComponent: StreamInfoSettings });
