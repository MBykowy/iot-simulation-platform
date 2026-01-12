package com.michalbykowy.iotsim.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final long HEARTBEAT_INTERVAL_MS = 10000;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic")
                .setHeartbeatValue(new long[]{HEARTBEAT_INTERVAL_MS, HEARTBEAT_INTERVAL_MS})
                .setTaskScheduler(heartbeatScheduler());

        config.setApplicationDestinationPrefixes("/app");
    }

    // Do zarządzania wątkami heartbeat
    @Bean
    public TaskScheduler heartbeatScheduler() {
        return new ThreadPoolTaskScheduler();
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // bardziej elastyczne niż setAllowedOrigins.
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }
}