package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.Rule;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import com.michalbykowy.iotsim.repository.RuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import com.jayway.jsonpath.JsonPath;

import java.util.List;
import java.util.Map;

@Service
public class SimulationEngine {

    @Autowired
    private RuleRepository ruleRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    // Główna metoda, którą będziemy wywoływać z zewnątrz
    public void processEvent(Device changedDevice) {
        System.out.println("SIM ENGINE: Processing event for device: " + changedDevice.getId());

        // 1. Znajdź wszystkie reguły, które mogą być aktywowane przez to urządzenie
        List<Rule> relevantRules = ruleRepository.findByTriggerDeviceId(changedDevice.getId());
        System.out.println("SIM ENGINE: Found " + relevantRules.size() + " relevant rules.");

        // 2. Przejdź po regułach i sprawdź warunki
        for (Rule rule : relevantRules) {
            if (checkCondition(rule, changedDevice)) {
                System.out.println("SIM ENGINE: Condition met for rule '" + rule.getName() + "'. Executing action.");
                executeAction(rule);
            }
        }
    }

    private boolean checkCondition(Rule rule, Device device) {
        try {
            // Parsujemy konfigurację wyzwalacza (trigger) z JSON-a
            Map<String, Object> triggerConfig = objectMapper.readValue(rule.getTriggerConfig(), Map.class);
            String path = (String) triggerConfig.get("path");
            String operator = (String) triggerConfig.get("operator"); // Zmieniamy z "condition" na "operator"
            Object expectedValue = triggerConfig.get("value");

            // Parsujemy aktualny stan urządzenia
            String deviceStateJson = device.getCurrentState();

            // Używamy JsonPath do wyciągnięcia wartości z aktualnego stanu
            Object actualValue = JsonPath.read(deviceStateJson, path);

            System.out.println("SIM ENGINE: Checking condition - Path: " + path + ", Operator: " + operator +
                    ", Expected: " + expectedValue + ", Actual: " + actualValue);

            // Prosta implementacja operatorów
            switch (operator.toUpperCase()) {
                case "EQUALS":
                    // Porównujemy jako stringi dla uproszczenia
                    return String.valueOf(actualValue).equals(String.valueOf(expectedValue));
                case "GREATER_THAN":
                    // Konwertujemy na liczby zmiennoprzecinkowe do porównania
                    return Double.parseDouble(String.valueOf(actualValue)) > Double.parseDouble(String.valueOf(expectedValue));
                case "LESS_THAN":
                    return Double.parseDouble(String.valueOf(actualValue)) < Double.parseDouble(String.valueOf(expectedValue));
                default:
                    System.err.println("SIM ENGINE: Unknown operator: " + operator);
                    return false;
            }
        } catch (Exception e) {
            System.err.println("SIM ENGINE: Error checking condition for rule " + rule.getId() + ": " + e.getMessage());
            return false;
        }
    }
    private void executeAction(Rule rule) {
        try {
            // Parsujemy konfigurację akcji z JSON-a
            Map<String, Object> actionConfig = objectMapper.readValue(rule.getActionConfig(), Map.class);
            String targetDeviceId = (String) actionConfig.get("deviceId");
            Object newStateObj = actionConfig.get("newState");

            // Konwertujemy obiekt nowego stanu z powrotem na string JSON
            String newStateJson = objectMapper.writeValueAsString(newStateObj);

            // Znajdujemy urządzenie docelowe w bazie
            deviceRepository.findById(targetDeviceId).ifPresent(targetDevice -> {
                System.out.println("SIM ENGINE: Updating device " + targetDeviceId + " with new state: " + newStateJson);

                // Ustawiamy nowy stan
                targetDevice.setCurrentState(newStateJson);

                // Zapisujemy zmiany w bazie
                Device updatedDevice = deviceRepository.save(targetDevice);

                // Wysyłamy aktualizację do frontendu
                messagingTemplate.convertAndSend("/topic/devices", updatedDevice);

                // TODO: W przyszłości tutaj można dodać rekurencyjne wywołanie processEvent(updatedDevice)
            });

        } catch (Exception e) {
            System.err.println("SIM ENGINE: Error executing action for rule " + rule.getId() + ": " + e.getMessage());
        }
    }
}