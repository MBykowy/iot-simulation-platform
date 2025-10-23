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
     * Znajduje wszystkie reguły, w których konfiguracji wyzwalacza (triggerConfig)
     * występuje podane ID urządzenia. Zapytanie wykorzystuje LIKE do przeszukiwania
     * pola tekstowego przechowującego JSON.
     *
     * @param deviceId ID urządzenia, które może być wyzwalaczem.
     * @return Lista pasujących reguł.
     */
    @Query("SELECT r FROM Rule r WHERE r.triggerConfig LIKE %:deviceId%")
    List<Rule> findByTriggerDeviceId(@Param("deviceId") String deviceId);

}