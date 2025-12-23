package com.michalbykowy.iotsim.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic")
                .setHeartbeatValue(new long[]{10000, 10000})
                .setTaskScheduler(heartbeatScheduler());

        config.setApplicationDestinationPrefixes("/app");
    }

    // do zarządzania wątkami hearbeat
    @org.springframework.context.annotation.Bean
    public org.springframework.scheduling.TaskScheduler heartbeatScheduler() {
        return new org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler();
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        //  setAllowedOriginPatterns("*") dla kompatybilności
        // bardziej elastyczne niż setAllowedOrigins.
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }


}