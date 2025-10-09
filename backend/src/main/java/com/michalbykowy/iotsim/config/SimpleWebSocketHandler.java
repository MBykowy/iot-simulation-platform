package com.michalbykowy.iotsim.config;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class SimpleWebSocketHandler extends TextWebSocketHandler {

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        System.out.println(">>> SERVER: New connection established: " + session.getId());
        session.sendMessage(new TextMessage("Connection established!"));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        System.out.println(">>> SERVER: Received message: " + message.getPayload());
        session.sendMessage(new TextMessage("SERVER ECHO: " + message.getPayload()));
    }
}