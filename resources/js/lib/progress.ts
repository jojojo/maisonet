export function pointsLabel(value: number | string): string {
    return Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

export const requestStatus: Record<string, string> = {
    pending: 'À valider',
    approved: 'Accordée, à organiser',
    fulfilled: 'Réalisée',
    rejected: 'Refusée',
    cancelled: 'Annulée',
};
