package com.michalbykowy.iotsim.config;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import com.influxdb.client.WriteApi;
import com.influxdb.client.WriteOptions;
import com.influxdb.client.write.events.WriteErrorEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InfluxDBConfig {

    private static final Logger logger = LoggerFactory.getLogger(InfluxDBConfig.class);

    private final String url;
    private final String token;
    private final String org;
    private final String bucket;

    public InfluxDBConfig(
            @Value("${influx.url}") String url,
            @Value("${influx.token}") String token,
            @Value("${influx.org}") String org,
            @Value("${influx.bucket}") String bucket) {
        this.url = url;
        this.token = token;
        this.org = org;
        this.bucket = bucket;
    }

    @Bean
    public InfluxDBClient influxDBClient() {
        logger.info("Initializing InfluxDB client. URL: {}, Org: {}, Bucket: {}", url, org, bucket);
        return InfluxDBClientFactory.create(url, token.toCharArray(), org, bucket);
    }

    @Bean
    public WriteApi writeApi(InfluxDBClient influxDBClient) {
        WriteOptions options = WriteOptions.builder()
                .batchSize(1000)
                .flushInterval(1000)
                .bufferLimit(10000)
                .jitterInterval(0)
                .retryInterval(5000)
                .build();

        WriteApi writeApi = influxDBClient.makeWriteApi(options);

        writeApi.listenEvents(WriteErrorEvent.class, event -> {
            System.err.println("!!! INFLUX WRITE ERROR !!! " + event.getThrowable().getMessage());
            if (event.getThrowable().getCause() != null) {
                System.err.println("Cause: " + event.getThrowable().getCause().getMessage());
            }
        });

        return writeApi;
    }
}