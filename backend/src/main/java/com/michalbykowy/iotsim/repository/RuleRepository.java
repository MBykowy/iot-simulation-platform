package com.michalbykowy.iotsim.repository;

import com.michalbykowy.iotsim.model.Rule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RuleRepository extends JpaRepository<Rule, String> {

    /**
     * Finds rules triggered by a specific device ID.
     * Uses the dedicated 'triggerDeviceId' column for lookup.
     */
    List<Rule> findByTriggerDeviceId(String deviceId);
}