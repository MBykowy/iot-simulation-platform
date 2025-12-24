import {useCallback, useEffect, useState} from 'react';
import {useAppStore} from '../stores/appStore';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

export interface Rule {
    id: string;
    name: string;
    triggerConfig: string;
    actionConfig: string;
}

/**
 * hook do zarządzania regułami automatyzacji.
 */
export function useRules() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const showSnackbar = useAppStore((state) => state.showSnackbar);

    const fetchRules = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/rules`);
            if (!response.ok) throw new Error('Failed to fetch rules');
            const data = await response.json() as Rule[];
            setRules(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Could not fetch rules.';
            showSnackbar(message, 'error');
            setRules([]);
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const deleteRule = async (ruleId: string): Promise<boolean> => {
        if (!window.confirm('Are you sure you want to delete this rule?')) {
            return false;
        }

        try {
            const response = await fetch(`${API_URL}/api/rules/${ruleId}`, { method: 'DELETE' });
            if (!response.ok) {
                throw new Error('Failed to delete rule');
            }
            setRules(prevRules => prevRules.filter(r => r.id !== ruleId));
            showSnackbar('Rule deleted successfully.', 'success');
            return true;
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Could not delete rule.';
            showSnackbar(message, 'error');
            return false;
        }
    };

    return {
        rules,
        isLoading,
        deleteRule,
        refreshRules: fetchRules
    };
}