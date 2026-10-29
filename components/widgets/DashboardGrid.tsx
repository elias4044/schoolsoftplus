'use client';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';

import type { WidgetId, WidgetInstance, WidgetSize } from '@/lib/widgets/types';

import CountdownWidget from './CountdownWidget';
import HomeworkWidget from './HomeworkWidget';
import LunchWidget from './LunchWidget';
import MessagesWidget from './MessagesWidget';
import NewsWidget from './NewsWidget';
import NotesWidget from './NotesWidget';
import ScheduleWidget from './ScheduleWidget';
import WeatherWidget from './WeatherWidget';
import { WidgetShell } from './WidgetShell';

// Map widgetId → component
const WIDGET_COMPONENTS: Record<WidgetId, React.ComponentType<{ size: WidgetSize }>> = {
  homework: HomeworkWidget,
  schedule: ScheduleWidget,
  notes: NotesWidget,
  lunch: LunchWidget,
  news: NewsWidget,
  weather: WeatherWidget,
  countdown: CountdownWidget,
  messages: MessagesWidget,
};

interface Props {
  widgets: WidgetInstance[];
  editing: boolean;
  onReorder: (widgets: WidgetInstance[]) => void;
  onResize: (instanceId: string, size: WidgetSize) => void;
  onRemove: (instanceId: string) => void;
}

export function DashboardGrid({ widgets, editing, onReorder, onResize, onRemove }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgets.findIndex((w) => w.instanceId === active.id);
    const newIndex = widgets.findIndex((w) => w.instanceId === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(widgets, oldIndex, newIndex));
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={widgets.map((w) => w.instanceId)} strategy={rectSortingStrategy}>
        {/* 4-column grid; row height is set by content but with a min */}
        <div className="grid auto-rows-[minmax(160px,auto)] grid-cols-4 gap-4">
          {widgets.map((instance) => {
            const Component = WIDGET_COMPONENTS[instance.widgetId];
            if (!Component) return null;
            return (
              <WidgetShell
                key={instance.instanceId}
                instance={instance}
                editing={editing}
                onResize={onResize}
                onRemove={onRemove}
              >
                <Component size={instance.size} />
              </WidgetShell>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
