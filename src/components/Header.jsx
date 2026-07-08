const Header = ({ title, summary, updatedAt }) => {
    return (
        <header className="dashboard-header">
            <div>
                <p className="header-eyebrow">Operational Overview</p>
                <h1>{title}</h1>
            </div>
            <div className="header-meta">
                <div className="header-chips">
                    {summary.map((item) => (
                        <div key={item.label} className={`chip chip-${item.tone}`}>
                            <span className="chip-label">{item.label}</span>
                            <span className="chip-value">{item.value}</span>
                        </div>
                    ))}
                </div>
                <div className="header-updated">
                    Updated {updatedAt}
                </div>
            </div>
        </header>
    );
};

export default Header;
