package com.michalbykowy.iotsim.repository;

import com.michalbykowy.iotsim.model.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeviceRepository extends JpaRepository<Device, String> {
    // Dzięki temu, że rozszerzamy JpaRepository, mamy za darmo
    // metody takie jak save(), findById(), findAll(), deleteById() itd.
    // Spring sam je zaimplementuje.
}