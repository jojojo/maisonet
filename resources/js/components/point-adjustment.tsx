import { Minus, Plus } from 'lucide-react';
import './point-adjustment.css';

export function PointAdjustment({
    basePoints,
    value,
    onChange,
    note,
    onNoteChange,
    disabled,
}: {
    basePoints: number;
    value: string;
    onChange: (value: string) => void;
    note: string;
    onNoteChange: (value: string) => void;
    disabled: boolean;
}) {
    const points = Number(value);
    const delta = points - basePoints;
    return (
        <fieldset className="point-adjustment" disabled={disabled}>
            <legend>Points pour cette réalisation</legend>
            <div className="point-adjustment-stepper">
                <button
                    type="button"
                    aria-label="Réduire les points"
                    disabled={disabled || points <= 0}
                    onClick={() => onChange(String(Math.max(0, points - 1)))}
                >
                    <Minus size={20} />
                </button>
                <label>
                    <input
                        aria-label="Total des points à attribuer"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        step={1}
                        required
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                    />
                    <span>points au total</span>
                </label>
                <button
                    type="button"
                    aria-label="Augmenter les points"
                    disabled={disabled || points >= 100}
                    onClick={() => onChange(String(Math.min(100, points + 1)))}
                >
                    <Plus size={20} />
                </button>
            </div>
            <p>
                Base : {basePoints} points
                {value !== '' && Number.isInteger(points) && delta !== 0 ? ` · ${delta > 0 ? '+' : ''}${delta} pour cette fois` : ''}. Le total sera
                partagé entre les participants.
            </p>
            <label className="point-adjustment-note">
                Un petit mot pour expliquer ? <span>(facultatif)</span>
                <input
                    type="text"
                    maxLength={500}
                    value={note}
                    onChange={(event) => onNoteChange(event.target.value)}
                    placeholder="Ex. : plus long que prévu, ou à faire plus soigneusement"
                />
            </label>
        </fieldset>
    );
}
