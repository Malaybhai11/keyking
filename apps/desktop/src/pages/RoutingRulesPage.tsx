import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { ShieldAlert, GripVertical, Save, Activity, Check } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface RoutingRule {
  provider: string
  model: string
}

interface ModelInfo {
  id: string
  provider: string
}

function SortableRuleItem({ rule, index }: { rule: RoutingRule, index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: rule.model })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 bg-white border-3 border-neo-dark p-4 shadow-neo-sm hover:shadow-neo-md transition-shadow cursor-default mb-3"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-neo-bg transition-colors"
      >
        <GripVertical className="w-5 h-5 text-neo-dark" />
      </div>
      
      <div className="flex-1 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase font-black text-neo-dark/50 mb-1">Priority {index + 1}</div>
          <div className="font-display font-bold text-lg text-neo-dark">
            {rule.model}
          </div>
        </div>
        <div className="px-3 py-1 bg-neo-yellow border-2 border-neo-dark text-xs font-black uppercase text-neo-dark">
          {rule.provider}
        </div>
      </div>
    </div>
  )
}

export default function RoutingRulesPage() {
  const [rules, setRules] = useState<RoutingRule[]>([])
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const savedRules = await invoke<RoutingRule[]>('get_routing_rules')
      const models = await invoke<ModelInfo[]>('get_available_models')
      
      setAvailableModels(models)

      if (savedRules.length > 0) {
        setRules(savedRules)
      } else {
        // If no rules exist, create a default priority from available models
        const defaultRules = models.map(m => ({ provider: m.provider, model: m.id }))
        setRules(defaultRules)
      }
    } catch (err) {
      console.error('Failed to load routing data', err)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      setRules((items) => {
        const oldIndex = items.findIndex(i => i.model === active.id)
        const newIndex = items.findIndex(i => i.model === over.id)
        
        return arrayMove(items, oldIndex, newIndex)
      })
      setSaved(false)
    }
  }

  async function saveRules() {
    setIsSaving(true)
    try {
      await invoke('save_routing_rules', { rules })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save rules', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black font-display uppercase tracking-tight text-neo-dark mb-2">Priority Routing</h1>
          <p className="text-neo-dark/70 font-medium">Drag and drop models to set global fallback order.</p>
        </div>
        <button
          onClick={saveRules}
          disabled={isSaving}
          className="flex items-center gap-2 bg-neo-green text-neo-dark px-6 py-3 border-3 border-neo-dark font-display font-black uppercase hover:-translate-y-1 hover:shadow-neo-md transition-all disabled:opacity-50"
        >
          {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {saved ? 'Saved' : 'Save Rules'}
        </button>
      </div>

      <div className="bg-neo-blue/10 border-3 border-neo-blue p-5 mb-8 flex gap-4">
        <ShieldAlert className="w-6 h-6 text-neo-blue shrink-0 mt-1" />
        <div>
          <h3 className="font-black font-display uppercase text-neo-dark mb-1">How it works</h3>
          <p className="text-sm text-neo-dark/80">
            When you send a request via KeyKing, we start at Priority 1. If that model hits a rate limit or goes down,
            we instantly fall back to Priority 2, 3, etc. When the higher priority model recovers, we route back to it automatically.
          </p>
        </div>
      </div>

      <div className="bg-white border-3 border-neo-dark p-6">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={rules.map(r => r.model)}
            strategy={verticalListSortingStrategy}
          >
            {rules.map((rule, index) => (
              <SortableRuleItem key={rule.model} rule={rule} index={index} />
            ))}
          </SortableContext>
        </DndContext>

        {rules.length === 0 && (
          <div className="text-center py-12 text-neo-dark/50 font-black uppercase border-3 border-dashed border-neo-dark/20">
            No models available. Add API keys to see models.
          </div>
        )}
      </div>
    </div>
  )
}
