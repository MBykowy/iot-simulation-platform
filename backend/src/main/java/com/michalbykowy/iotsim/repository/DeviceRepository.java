package com.michalbykowy.iotsim.repository;

import com.michalbykowy.iotsim.model.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeviceRepository extends JpaRepository<Device, String> {
    List<Device> findBySimulationActive(boolean simulationActive);
}