import { LANGUAGE_NAMES, LANGUAGES, useT } from '../i18n';
import { useSettings } from '../settings';
import { Segmented } from './Segmented';

/** Ajustes que se pueden cambiar en cualquier momento, incluso a mitad de una partida. */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { settings, update } = useSettings();

  const helpHint = {
    full: t.settings.helpFullHint,
    targets: t.settings.helpTargetsHint,
    none: t.settings.helpNoneHint,
  }[settings.help];

  return (
    <div className="overlay top" role="dialog" aria-modal="true" aria-label={t.settings.title} onClick={onClose}>
      <div className="panel settings" onClick={(event) => event.stopPropagation()}>
        <h2>{t.settings.title}</h2>

        <section>
          <h3>{t.settings.language}</h3>
          <Segmented
            label={t.settings.language}
            value={settings.language}
            options={LANGUAGES.map((language) => ({ value: language, label: LANGUAGE_NAMES[language] }))}
            onChange={(language) => update({ language })}
          />
        </section>

        <section>
          <h3>{t.settings.help}</h3>
          <Segmented
            label={t.settings.help}
            value={settings.help}
            options={[
              { value: 'full', label: t.settings.helpFull },
              { value: 'targets', label: t.settings.helpTargets },
              { value: 'none', label: t.settings.helpNone },
            ]}
            onChange={(help) => update({ help })}
          />
          <p className="hint">{helpHint}</p>
        </section>

        <section>
          <h3>{t.settings.botSpeed}</h3>
          <Segmented
            label={t.settings.botSpeed}
            value={settings.botSpeed}
            options={[
              { value: 'slow', label: t.settings.slow },
              { value: 'normal', label: t.settings.normal },
              { value: 'fast', label: t.settings.fast },
            ]}
            onChange={(botSpeed) => update({ botSpeed })}
          />
        </section>

        <section>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.confirmDiscard}
              onChange={(event) => update({ confirmDiscard: event.target.checked })}
            />
            <span>{t.settings.confirmDiscard}</span>
          </label>
          <p className="hint">{t.settings.confirmDiscardHint}</p>
        </section>

        <button type="button" className="btn primary" autoFocus onClick={onClose}>
          {t.settings.close}
        </button>
      </div>
    </div>
  );
}
