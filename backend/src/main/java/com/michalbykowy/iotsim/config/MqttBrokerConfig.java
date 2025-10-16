package com.michalbykowy.iotsim.config;

import io.moquette.broker.Server;
import io.moquette.broker.config.MemoryConfig;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Properties;

@Component
public class MqttBrokerConfig {

    private Server mqttBroker;

    @PostConstruct
    public void startBroker() throws IOException {
        Properties properties = new Properties();
        properties.setProperty("port", "1883");
        // TA LINIA JEST KLUCZOWA. "0.0.0.0" oznacza "nasłuchuj na wszystkich interfejsach sieciowych"
        properties.setProperty("host", "0.0.0.0");
        properties.setProperty("allow_anonymous", "true");

        final MemoryConfig config = new MemoryConfig(properties);

        mqttBroker = new Server();
        mqttBroker.startServer(config);

        System.out.println(">>> Embedded Moquette MQTT Broker started on host 0.0.0.0, port 1883 <<<");
    }

    @PreDestroy
    public void stopBroker() {
        if (mqttBroker != null) {
            mqttBroker.stopServer();
            System.out.println(">>> Embedded Moquette MQTT Broker stopped <<<");
        }
    }
}