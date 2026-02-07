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

registerWidget({ id: "chat", name: "Chat", component: ChatWidget, defaults: { x: 20, y: 400, width: 320, height: 300 } });
registerWidget({ id: "viewer-count", name: "Viewer count", component: ViewerCountWidget, defaults: { x: 20, y: 20, width: 200, height: 60 } });
registerWidget({ id: "follower-alerts", name: "Follower alerts", component: FollowerAlertWidget, defaults: { x: 600, y: 100, width: 350, height: 120 } });
registerWidget({ id: "event-feed", name: "Event feed", component: EventFeedWidget, defaults: { x: 20, y: 100, width: 320, height: 280 } });
registerWidget({ id: "custom-text", name: "Custom text", component: CustomTextWidget, defaults: { x: 600, y: 500, width: 400, height: 80 } });
registerWidget({ id: "chat-presence", name: "Chat presence", component: ChatPresenceWidget, defaults: { x: 1580, y: 20, width: 300, height: 400 } });
registerWidget({ id: "follow-events", name: "Follow events", component: FollowEventsWidget, defaults: { x: 1580, y: 440, width: 300, height: 250 } });
registerWidget({ id: "event-log", name: "Event log", component: EventLogWidget, defaults: { x: 600, y: 250, width: 500, height: 350 } });
