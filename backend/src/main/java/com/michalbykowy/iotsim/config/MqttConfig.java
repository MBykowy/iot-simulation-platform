package com.michalbykowy.iotsim.config;

import com.michalbykowy.iotsim.service.MqttMessageService;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.core.MessageProducer;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.core.MqttPahoClientFactory;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;

@Configuration
public class MqttConfig {

    private static final long COMPLETION_TIMEOUT_MS = 5000;

    private final String brokerUrl;
    private final String clientId;
    private final String topic;
    private final MqttMessageService mqttMessageService;

    public MqttConfig(
            @Value("${mqtt.broker.url}") String brokerUrl,
            @Value("${mqtt.client.id}") String clientId,
            @Value("${mqtt.topic}") String topic,
            MqttMessageService mqttMessageService) {
        this.brokerUrl = brokerUrl;
        this.clientId = clientId;
        this.topic = topic;
        this.mqttMessageService = mqttMessageService;
    }

    @Bean
    public MqttPahoClientFactory mqttClientFactory() {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();
        MqttConnectOptions options = new MqttConnectOptions();
        options.setServerURIs(new String[] { brokerUrl });
        options.setAutomaticReconnect(true);
        options.setCleanSession(true);
        factory.setConnectionOptions(options);
        return factory;
    }

    //  INBOUND

    @Bean
    public MessageChannel mqttInputChannel() {
        return new DirectChannel();
    }

    @Bean
    public MessageProducer inbound() {
        MqttPahoMessageDrivenChannelAdapter adapter =
                new MqttPahoMessageDrivenChannelAdapter(clientId + "_inbound", mqttClientFactory(), topic);
        adapter.setCompletionTimeout(COMPLETION_TIMEOUT_MS);
        adapter.setConverter(new DefaultPahoMessageConverter());
        adapter.setQos(1);
        adapter.setOutputChannel(mqttInputChannel());
        return adapter;
    }

    @Bean
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public MessageHandler handler() {
        return (Message<?> message) -> {
            String receivedTopic = message.getHeaders().get("mqtt_receivedTopic", String.class);
            String payload = message.getPayload().toString();
            mqttMessageService.handleMessage(receivedTopic, payload);
        };
    }

    //  OUTBOUND

    @Bean
    public MessageChannel mqttOutboundChannel() {
        return new DirectChannel();
    }

    @Bean
    @ServiceActivator(inputChannel = "mqttOutboundChannel")
    public MessageHandler mqttOutbound() {
        MqttPahoMessageHandler messageHandler =
                new MqttPahoMessageHandler(clientId + "_outbound", mqttClientFactory());
        messageHandler.setAsync(true);
        messageHandler.setDefaultTopic("iot/commands");
        return messageHandler;
    }
}