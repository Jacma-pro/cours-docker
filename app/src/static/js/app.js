const FILTERS = [
    { id: 'all', label: 'Toutes' },
    { id: 'active', label: 'À faire' },
    { id: 'done', label: 'Terminées' },
];

const COLORS = ['#8b5cf6', '#ec4899', '#34d399', '#fbbf24', '#38bdf8'];

function greeting() {
    const h = new Date().getHours();
    if (h < 6) return 'Bonne nuit';
    if (h < 18) return 'Bonjour';
    return 'Bonsoir';
}

function api(url, method, body) {
    return fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body && JSON.stringify(body),
    });
}

function Confetti() {
    const pieces = React.useMemo(
        () =>
            Array.from({ length: 70 }, (_, i) => ({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 0.6,
                duration: 1.8 + Math.random() * 1.6,
                color: COLORS[i % COLORS.length],
            })),
        [],
    );
    return (
        <div className="confetti">
            {pieces.map(p => (
                <i
                    key={p.id}
                    style={{
                        left: `${p.left}%`,
                        background: p.color,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                    }}
                />
            ))}
        </div>
    );
}

function App() {
    const [items, setItems] = React.useState(null);
    const [filter, setFilter] = React.useState('all');
    const [celebrate, setCelebrate] = React.useState(0);

    React.useEffect(() => {
        fetch('/items')
            .then(r => r.json())
            .then(setItems);
    }, []);

    React.useEffect(() => {
        if (!celebrate) return;
        const t = setTimeout(() => setCelebrate(0), 3800);
        return () => clearTimeout(t);
    }, [celebrate]);

    if (items === null) return <div className="card empty">Chargement…</div>;

    const total = items.length;
    const doneCount = items.filter(i => i.completed).length;
    const percent = total ? Math.round((doneCount / total) * 100) : 0;
    const visible = items.filter(
        i =>
            filter === 'all' ||
            (filter === 'done' ? i.completed : !i.completed),
    );

    const add = async name => {
        const item = await api('/items', 'POST', { name }).then(r => r.json());
        setItems(prev => [...prev, item]);
    };

    const update = async (item, changes) => {
        const next = { ...item, ...changes };
        const saved = await api(`/items/${item.id}`, 'PUT', {
            name: next.name,
            completed: next.completed,
        }).then(r => r.json());
        const updated = items.map(i => (i.id === saved.id ? saved : i));
        setItems(updated);
        if (updated.length && updated.every(i => i.completed) && changes.completed) {
            setCelebrate(Date.now());
        }
    };

    const remove = async item => {
        await fetch(`/items/${item.id}`, { method: 'DELETE' });
        setItems(prev => prev.filter(i => i.id !== item.id));
    };

    const clearDone = () => items.filter(i => i.completed).forEach(remove);

    const today = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    return (
        <div className="card">
            {celebrate > 0 && <Confetti key={celebrate} />}

            <div className="header">
                <div className="date">{today}</div>
                <h1 className="title">
                    {greeting()}, <span>prêt à tout déchirer ?</span>
                </h1>
            </div>

            <div className="progress">
                <div className="progress-row">
                    <span>
                        {doneCount} sur {total} terminée{doneCount > 1 ? 's' : ''}
                    </span>
                    <span>{percent}%</span>
                </div>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${percent}%` }} />
                </div>
            </div>

            <AddForm onAdd={add} />

            <div className="filters">
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        className={filter === f.id ? 'active' : ''}
                        onClick={() => setFilter(f.id)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {visible.length === 0 ? (
                <div className="empty">
                    <span className="emoji">{total === 0 ? '🌙' : '🎉'}</span>
                    {total === 0
                        ? 'Rien à faire pour le moment. Ajoute ta première tâche !'
                        : 'Rien à afficher ici.'}
                </div>
            ) : (
                <ul className="list">
                    {visible.map(item => (
                        <Item
                            key={item.id}
                            item={item}
                            onUpdate={update}
                            onRemove={remove}
                        />
                    ))}
                </ul>
            )}

            {doneCount > 0 && (
                <div className="footer">
                    <span>{total - doneCount} restante{total - doneCount > 1 ? 's' : ''}</span>
                    <button onClick={clearDone}>Effacer les terminées</button>
                </div>
            )}
        </div>
    );
}

function AddForm({ onAdd }) {
    const [value, setValue] = React.useState('');
    const [busy, setBusy] = React.useState(false);

    const submit = async e => {
        e.preventDefault();
        const name = value.trim();
        if (!name || busy) return;
        setBusy(true);
        await onAdd(name);
        setValue('');
        setBusy(false);
    };

    return (
        <form className="add" onSubmit={submit}>
            <input
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="Qu'est-ce qu'on fait aujourd'hui ?"
                maxLength={255}
                autoFocus
            />
            <button type="submit" disabled={!value.trim() || busy} aria-label="Ajouter">
                <i className={busy ? 'fa fa-spinner fa-spin' : 'fa fa-plus'} />
            </button>
        </form>
    );
}

function Item({ item, onUpdate, onRemove }) {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(item.name);

    const save = () => {
        const name = draft.trim();
        setEditing(false);
        if (name && name !== item.name) onUpdate(item, { name });
        else setDraft(item.name);
    };

    return (
        <li className={`item ${item.completed ? 'done' : ''}`}>
            <button
                className="check"
                onClick={() => onUpdate(item, { completed: !item.completed })}
                aria-label={item.completed ? 'Marquer comme à faire' : 'Marquer comme terminée'}
            >
                <i className="fa fa-check" />
            </button>

            {editing ? (
                <input
                    className="edit"
                    value={draft}
                    autoFocus
                    maxLength={255}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={save}
                    onKeyDown={e => {
                        if (e.key === 'Enter') save();
                        if (e.key === 'Escape') {
                            setDraft(item.name);
                            setEditing(false);
                        }
                    }}
                />
            ) : (
                <span
                    className="name"
                    title="Double-clic pour modifier"
                    onDoubleClick={() => setEditing(true)}
                >
                    {item.name}
                </span>
            )}

            <button className="remove" onClick={() => onRemove(item)} aria-label="Supprimer">
                <i className="fa fa-trash" />
            </button>
        </li>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
