import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { ShieldAlert, GripVertical, Save, Check, Plus, Trash2, X } from 'lucide-react'
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

function SortableRuleItem({ rule, index, onRemove }: { rule: RoutingRule, index: number, onRemove: () => void }) {
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
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-neo-yellow border-2 border-neo-dark text-xs font-black uppercase text-neo-dark">
            {rule.provider}
          </div>
          <button onClick={onRemove} className="p-1.5 hover:bg-neo-pink hover:text-white border-2 border-transparent hover:border-neo-dark transition-all text-neo-dark/50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RoutingRulesPage() {
  const [rules, setRules] = useState<RoutingRule[]>([])
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [modelSearch, setModelSearch] = useState('')

  const filteredModels = modelSearch
    ? availableModels.filter(m => 
        m.id.toLowerCase().includes(modelSearch.toLowerCase()) || 
        m.provider.toLowerCase().includes(modelSearch.toLowerCase())
      )
    : availableModels

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
      }
    } catch (error) {
      console.error('Failed to load data:', error)
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
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-neo-yellow text-neo-dark px-4 py-3 border-3 border-neo-dark font-display font-black uppercase hover:-translate-y-1 hover:shadow-neo-md transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Add Model
          </button>
          <button
            onClick={saveRules}
            disabled={isSaving}
            className="flex items-center gap-2 bg-neo-green text-neo-dark px-6 py-3 border-3 border-neo-dark font-display font-black uppercase hover:-translate-y-1 hover:shadow-neo-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {saved ? 'Saved' : 'Save Rules'}
          </button>
        </div>
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

      <div className="bg-white border-3 border-neo-dark p-6" data-tour="tour-step-6">
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
              <SortableRuleItem 
                key={rule.model} 
                rule={rule} 
                index={index} 
                onRemove={() => {
                  setRules(rules.filter(r => r.model !== rule.model))
                  setSaved(false)
                }} 
              />
            ))}
          </SortableContext>
        </DndContext>

        {rules.length === 0 && (
          <div className="text-center py-12 text-neo-dark/50 font-black uppercase border-3 border-dashed border-neo-dark/20">
            No active routing rules. Click "Add Model" to setup priority.
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-neo-dark/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-neo-dark shadow-neo-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b-3 border-neo-dark bg-neo-yellow">
              <h2 className="font-display font-black uppercase text-xl">Select Models</h2>
              <button onClick={() => setShowAddModal(false)} className="hover:bg-neo-pink p-1 border-2 border-transparent hover:border-neo-dark transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b-3 border-neo-dark bg-neo-bg">
              <input
                type="text"
                placeholder="Search models or providers..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="w-full bg-white border-2 border-neo-dark px-3 py-2 text-neo-dark font-bold placeholder:text-neo-dark/50 focus:outline-none focus:bg-neo-yellow transition-all"
              />
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {filteredModels.length === 0 && availableModels.length > 0 && (
                <div className="text-center py-6 text-neo-dark/50 font-black uppercase">
                  No models found matching "{modelSearch}".
                </div>
              )}
              {availableModels.length === 0 && (
                <div className="text-center py-6 text-neo-dark/50 font-black uppercase">
                  Add API keys first to see models.
                </div>
              )}
              {filteredModels.map(m => {
                const isAdded = rules.some(r => r.model === m.id)
                return (
                  <div key={m.id} className="flex items-center justify-between p-3 border-2 border-neo-dark bg-neo-bg">
                    <div>
                      <div className="font-bold">{m.id}</div>
                      <div className="text-xs text-neo-dark/70 uppercase">{m.provider}</div>
                    </div>
                    <button
                      disabled={isAdded}
                      onClick={() => {
                        setRules([...rules, { provider: m.provider, model: m.id }])
                        setSaved(false)
                      }}
                      className="px-3 py-1 bg-neo-green border-2 border-neo-dark text-xs font-black uppercase disabled:opacity-50 disabled:bg-neo-bg cursor-pointer"
                    >
                      {isAdded ? 'Added' : 'Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
