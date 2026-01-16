import { useMemo, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { apiClient } from '../api/apiClient';
import { AggregateFunction, RuleOperator } from '../types';

interface RuleFormData {
    name: string;
    isTimeBased: boolean;
    triggerDeviceId: string;
    triggerPath: string;
    triggerField: string;
    triggerRange: string;
    triggerAggregate: AggregateFunction;
    triggerOperator: RuleOperator;
    triggerValue: string;
    actionDeviceId: string;
    actionNewState: string;
}

const INITIAL_STATE: RuleFormData = {
    name: '',
    isTimeBased: false,
    triggerDeviceId: '',
    triggerPath: '$.temperature',
    triggerField: 'temperature',
    triggerRange: '5m',
    triggerAggregate: AggregateFunction.MEAN,
    triggerOperator: RuleOperator.GREATER_THAN,
    triggerValue: '25',
    actionDeviceId: '',
    actionNewState: '{"status": "ON"}',
};

export function useRuleForm(onRuleAdded: () => void) {
    const [formData, setFormData] = useState<RuleFormData>(INITIAL_STATE);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const showSnackbar = useAppStore((state) => state.showSnackbar);

    const isFormValid = useMemo(() => {
        return (
            formData.name.trim() !== '' &&
            formData.triggerDeviceId.trim() !== '' &&
            formData.actionDeviceId.trim() !== ''
        );
    }, [formData]);

    const updateField = <K extends keyof RuleFormData>(
        field: K,
        value: RuleFormData[K],
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!isFormValid) {
            showSnackbar('Please fill all required fields.', 'warning');
            return;
        }
        setIsSubmitting(true);

        let triggerConfig;

        if (formData.isTimeBased) {
            triggerConfig = {
                deviceId: formData.triggerDeviceId,
                aggregate: formData.triggerAggregate,
                field: formData.triggerField,
                range: formData.triggerRange,
                operator: formData.triggerOperator,
                value: formData.triggerValue,
            };
        } else {
            triggerConfig = {
                deviceId: formData.triggerDeviceId,
                path: formData.triggerPath,
                operator: formData.triggerOperator,
                value: formData.triggerValue,
                field: formData.triggerPath
            };
        }

        let newStateParsed;
        try {
            newStateParsed = JSON.parse(formData.actionNewState);
        } catch {
            showSnackbar('Invalid JSON in Action New State', 'error');
            setIsSubmitting(false);
            return;
        }

        const actionConfig = {
            deviceId: formData.actionDeviceId,
            newState: newStateParsed,
        };
        const newRule = { name: formData.name, triggerConfig, actionConfig };

        try {
            const result = await apiClient('/api/rules', {
                method: 'POST',
                body: newRule,
            });

            if (result) {
                showSnackbar('Rule created successfully!', 'success');
                setFormData(INITIAL_STATE);
                onRuleAdded();
            }
        } catch (e) {
            // logged by apiclient
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        formData,
        isSubmitting,
        isFormValid,
        updateField,
        handleSubmit,
    };
}