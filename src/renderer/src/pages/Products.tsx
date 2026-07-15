import { useState } from 'react'
import { Archive, ArchiveRestore, Boxes, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { CATEGORIES, categoryLabel, defaultNature, natureLabel } from '../../../shared/domain'
import type { CategoryId, ProductNature } from '../../../shared/types'

const SWATCHES = ['#e8c169', '#6db3f2', '#4ade9a', '#b18cf2', '#f2a56d', '#6ddcf2', '#f4515f']

export function Products(): JSX.Element {
  const db = useStore((s) => s.db)
  const {
    addPlatform,
    updatePlatform,
    removePlatform,
    addProduct,
    updateProduct,
    archiveProduct,
    removeProduct,
    toast
  } = useStore((s) => ({
    addPlatform: s.addPlatform,
    updatePlatform: s.updatePlatform,
    removePlatform: s.removePlatform,
    addProduct: s.addProduct,
    updateProduct: s.updateProduct,
    archiveProduct: s.archiveProduct,
    removeProduct: s.removeProduct,
    toast: s.toast
  }))

  const [platModal, setPlatModal] = useState<{ open: boolean; id?: string }>({ open: false })
  const [platName, setPlatName] = useState('')
  const [platColor, setPlatColor] = useState(SWATCHES[0])

  const [prodModal, setProdModal] = useState<{ open: boolean; id?: string; platformId?: string }>({
    open: false
  })
  const [prodName, setProdName] = useState('')
  const [prodPlatform, setProdPlatform] = useState('')
  const [prodCategory, setProdCategory] = useState<CategoryId>('assurance_vie')
  const [prodSubtype, setProdSubtype] = useState('')
  const [prodNature, setProdNature] = useState<ProductNature>('growth')

  const [confirm, setConfirm] = useState<{ open: boolean; kind?: 'platform' | 'product'; id?: string }>(
    { open: false }
  )

  // Platform modal helpers
  const openNewPlatform = (): void => {
    setPlatName('')
    setPlatColor(SWATCHES[db.platforms.length % SWATCHES.length])
    setPlatModal({ open: true })
  }
  const openEditPlatform = (id: string): void => {
    const p = db.platforms.find((x) => x.id === id)
    if (!p) return
    setPlatName(p.name)
    setPlatColor(p.color ?? SWATCHES[0])
    setPlatModal({ open: true, id })
  }
  const savePlatform = (): void => {
    if (!platName.trim()) return
    if (platModal.id) {
      updatePlatform(platModal.id, { name: platName.trim(), color: platColor })
    } else {
      addPlatform(platName.trim(), platColor)
    }
    setPlatModal({ open: false })
    toast('Plateforme enregistrée', 'success')
  }

  // Product modal helpers
  const openNewProduct = (platformId?: string): void => {
    setProdName('')
    setProdPlatform(platformId ?? db.platforms[0]?.id ?? '')
    setProdCategory('assurance_vie')
    setProdSubtype('')
    setProdNature(defaultNature('assurance_vie'))
    setProdModal({ open: true, platformId })
  }
  const openEditProduct = (id: string): void => {
    const p = db.products.find((x) => x.id === id)
    if (!p) return
    setProdName(p.name)
    setProdPlatform(p.platformId)
    setProdCategory(p.category)
    setProdSubtype(p.subtype ?? '')
    setProdNature(p.nature)
    setProdModal({ open: true, id })
  }
  // When the category changes, suggest the matching default nature.
  const onCategoryChange = (cat: CategoryId): void => {
    setProdCategory(cat)
    setProdNature(defaultNature(cat))
  }
  const saveProduct = (): void => {
    if (!prodName.trim() || !prodPlatform) return
    if (prodModal.id) {
      updateProduct(prodModal.id, {
        name: prodName.trim(),
        platformId: prodPlatform,
        category: prodCategory,
        subtype: prodSubtype.trim() || undefined,
        nature: prodNature
      })
    } else {
      addProduct({
        name: prodName.trim(),
        platformId: prodPlatform,
        category: prodCategory,
        subtype: prodSubtype.trim() || undefined,
        nature: prodNature
      })
    }
    setProdModal({ open: false })
    toast('Produit enregistré', 'success')
  }

  const doConfirmDelete = (): void => {
    if (confirm.kind === 'platform' && confirm.id) removePlatform(confirm.id)
    if (confirm.kind === 'product' && confirm.id) removeProduct(confirm.id)
    setConfirm({ open: false })
    toast('Suppression effectuée', 'success')
  }

  if (db.platforms.length === 0) {
    return (
      <>
        <PageHeader
          title="Produits"
          subtitle="Organise ton patrimoine par plateforme et par produit."
          actions={
            <button className="btn-primary" onClick={openNewPlatform}>
              <Plus size={16} /> Nouvelle plateforme
            </button>
          }
        />
        <EmptyState
          icon={<Boxes size={26} />}
          title="Commence par une plateforme"
          hint="Une plateforme est un établissement (ex : Fortuneo, Linxea, Crédit Mutuel). Tu y rattacheras ensuite tes produits."
          action={
            <button className="btn-primary" onClick={openNewPlatform}>
              <Plus size={16} /> Créer une plateforme
            </button>
          }
        />
        {renderPlatformModal()}
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Produits"
        subtitle="Ajoute, modifie ou archive tes produits en un clic."
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={openNewPlatform}>
              <Plus size={16} /> Plateforme
            </button>
            <button className="btn-primary" onClick={() => openNewProduct()}>
              <Plus size={16} /> Produit
            </button>
          </div>
        }
      />

      <div className="space-y-5">
        {db.platforms.map((plat) => {
          const products = db.products.filter((p) => p.platformId === plat.id)
          return (
            <div key={plat.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-line px-5 py-3">
                <span className="h-3 w-3 rounded-sm" style={{ background: plat.color ?? '#e8c169' }} />
                <h3 className="text-sm font-semibold text-slate-100">{plat.name}</h3>
                <span className="chip">{products.length} produit(s)</span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    className="btn-subtle h-8 w-8 !px-0"
                    title="Ajouter un produit"
                    onClick={() => openNewProduct(plat.id)}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    className="btn-subtle h-8 w-8 !px-0"
                    title="Modifier la plateforme"
                    onClick={() => openEditPlatform(plat.id)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="btn-subtle h-8 w-8 !px-0 hover:text-coral-400"
                    title="Supprimer la plateforme"
                    onClick={() => setConfirm({ open: true, kind: 'platform', id: plat.id })}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {products.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-500">
                  Aucun produit.{' '}
                  <button className="text-gold-500 hover:underline" onClick={() => openNewProduct(plat.id)}>
                    En ajouter un
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-line/60">
                  {products.map((p) => {
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-100">{p.name}</span>
                            <span
                              className={`chip ${
                                p.nature === 'cash'
                                  ? '!border-mint-500/30 !text-mint-400'
                                  : '!border-sky-500/30 !text-sky-400'
                              }`}
                            >
                              {natureLabel(p.nature)}
                            </span>
                            {!p.active && (
                              <span className="chip !border-coral-500/30 !text-coral-400">archivé</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            {categoryLabel(p.category)}
                            {p.subtype ? ` · ${p.subtype}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            className="btn-subtle h-8 w-8 !px-0"
                            title="Modifier"
                            onClick={() => openEditProduct(p.id)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="btn-subtle h-8 w-8 !px-0"
                            title={p.active ? 'Archiver' : 'Réactiver'}
                            onClick={() => archiveProduct(p.id, p.active)}
                          >
                            {p.active ? <Archive size={15} /> : <ArchiveRestore size={15} />}
                          </button>
                          <button
                            className="btn-subtle h-8 w-8 !px-0 hover:text-coral-400"
                            title="Supprimer"
                            onClick={() => setConfirm({ open: true, kind: 'product', id: p.id })}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {renderPlatformModal()}

      {/* Product modal */}
      <Modal
        open={prodModal.open}
        title={prodModal.id ? 'Modifier le produit' : 'Nouveau produit'}
        onClose={() => setProdModal({ open: false })}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setProdModal({ open: false })}>
              Annuler
            </button>
            <button className="btn-primary" onClick={saveProduct}>
              Enregistrer
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nom du produit</label>
            <input
              className="field"
              autoFocus
              placeholder="ex : PEA, Fonds euros, MSCI World…"
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Plateforme</label>
              <select
                className="field"
                value={prodPlatform}
                onChange={(e) => setProdPlatform(e.target.value)}
              >
                {db.platforms.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Catégorie</label>
              <select
                className="field"
                value={prodCategory}
                onChange={(e) => onCategoryChange(e.target.value as CategoryId)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Sous-type (optionnel)</label>
            <input
              className="field"
              placeholder="ex : Fonds euros, UC / ETF, Actions…"
              value={prodSubtype}
              onChange={(e) => setProdSubtype(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Permet de distinguer plusieurs poches d’un même produit (ex : fonds euros vs UC).
            </p>
          </div>
          <div>
            <label className="label">Type de suivi</label>
            <div className="grid grid-cols-2 gap-2">
              {(['cash', 'growth'] as ProductNature[]).map((n) => {
                const active = prodNature === n
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setProdNature(n)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? 'border-gold-500/60 bg-gold-500/10'
                        : 'border-line bg-ink-900/60 hover:bg-ink-800/60'
                    }`}
                  >
                    <div className="text-sm font-medium text-slate-100">{natureLabel(n)}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      {n === 'cash'
                        ? 'Les variations = tes mouvements. Perf. 0 sauf intérêts déclarés.'
                        : 'Les variations = performance. Sauf versement/retrait déclaré.'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirm delete */}
      <Modal
        open={confirm.open}
        title="Confirmer la suppression"
        onClose={() => setConfirm({ open: false })}
        width={440}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConfirm({ open: false })}>
              Annuler
            </button>
            <button className="btn-danger" onClick={doConfirmDelete}>
              <Trash2 size={16} /> Supprimer
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          {confirm.kind === 'platform'
            ? 'Supprimer cette plateforme supprimera aussi tous ses produits et tout leur historique de saisies. Cette action est irréversible.'
            : 'Supprimer ce produit effacera tout son historique de saisies. Cette action est irréversible.'}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Astuce : pour conserver l’historique sans afficher le produit, utilise plutôt « Archiver ».
        </p>
      </Modal>
    </>
  )

  function renderPlatformModal(): JSX.Element {
    return (
      <Modal
        open={platModal.open}
        title={platModal.id ? 'Modifier la plateforme' : 'Nouvelle plateforme'}
        onClose={() => setPlatModal({ open: false })}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setPlatModal({ open: false })}>
              Annuler
            </button>
            <button className="btn-primary" onClick={savePlatform}>
              Enregistrer
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nom de la plateforme</label>
            <input
              className="field"
              autoFocus
              placeholder="ex : Fortuneo, Linxea, Crédit Mutuel de Bretagne…"
              value={platName}
              onChange={(e) => setPlatName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Couleur</label>
            <div className="flex gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => setPlatColor(c)}
                  className={`h-8 w-8 rounded-lg transition ${
                    platColor === c ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-ink-850' : ''
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    )
  }
}
