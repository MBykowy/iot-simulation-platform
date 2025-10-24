package com.michalbykowy.iotsim.config;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InfluxDBConfig {

    @Value("${influx.url}")
    private String url;

    @Value("${influx.token}")
    private String token;

    @Value("${influx.org}")
    private String org;

    @Value("${influx.bucket}")
    private String bucket;

    @Bean
    public InfluxDBClient influxDBClient() {

        System.out.println("--- InfluxDB Client Configuration ---");
        System.out.println("URL: " + url);
        System.out.println("Org: " + org);
        System.out.println("Bucket: " + bucket);
        System.out.println("-----------------------------------");
        return InfluxDBClientFactory.create(url, token.toCharArray(), org, bucket);
    }
}