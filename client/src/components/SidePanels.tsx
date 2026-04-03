type Props = { bond: number };

export function LeftPanel({ bond }: Props) {
  return (
    <aside className="panel panel--left pixel-border">
      <h2 className="panel__title">关系</h2>
      <div className="rel pixel-border">
        <div className="rel__pair">Alex · Mia</div>
        <div className="rel__bar pixel-inset">
          <div className="rel__fill" style={{ width: `${bond}%` }} />
        </div>
        <p className="rel__hint">亲密度 {Math.round(bond)} / 100</p>
      </div>
      <div className="hint-box pixel-border">
        <p className="hint-box__p">
          线上地址 <code>/aigame/</code>，Worker 99 仍占根域。对话由 <strong>OpenRouter</strong>（
          <code>OPENROUTER_API_KEY</code>）生成；本地请 <code>wrangler dev</code>（根目录）+
          <code>npm run dev -w client</code>。
        </p>
      </div>
    </aside>
  );
}
