package com.michalbykowy.iotsim.service;

import com.michalbykowy.iotsim.event.VirtualDeviceCommandLoopbackEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class VirtualDeviceLoopbackListener {

    private final DeviceService deviceService;

    public VirtualDeviceLoopbackListener(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @EventListener
    public void handleLoopback(VirtualDeviceCommandLoopbackEvent event) {
        deviceService.handleDeviceEvent(event.payload());
    }
}