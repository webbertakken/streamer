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
import { CustomTextWidget } from "./custom-text/CustomTextWidget";
import { ChatPresenceWidget } from "./chat-presence/ChatPresenceWidget";
import { FollowEventsWidget } from "./follow-events/FollowEventsWidget";
import { EventLogWidget } from "./event-log/EventLogWidget";

registerWidget({ id: "chat", name: "Chat", component: ChatWidget, singleton: true, defaults: { x: 7, y: 842, width: 412, height: 292 } });
registerWidget({ id: "viewer-count", name: "Viewer count", component: ViewerCountWidget, singleton: true, defaults: { x: 1189, y: 27, width: 200, height: 60 } });
registerWidget({ id: "follower-alerts", name: "Follower alerts", component: FollowerAlertWidget, singleton: true, defaults: { x: 1115, y: 997, width: 350, height: 120 } });
registerWidget({ id: "event-feed", name: "Event feed", component: EventFeedWidget, singleton: true, defaults: { x: 2254, y: 896, width: 295, height: 268 } });
registerWidget({ id: "custom-text", name: "Custom text", component: CustomTextWidget, defaults: { x: 1092, y: 90, width: 400, height: 80 } });
registerWidget({ id: "chat-presence", name: "Chat presence", component: ChatPresenceWidget, singleton: true, defaults: { x: 2394, y: 52, width: 149, height: 566 } });
registerWidget({ id: "follow-events", name: "Follow events", component: FollowEventsWidget, singleton: true, defaults: { x: 2253, y: 644, width: 294, height: 221 } });
registerWidget({ id: "event-log", name: "Event log", component: EventLogWidget, singleton: true, defaults: { x: 5, y: 1164, width: 415, height: 215 } });
