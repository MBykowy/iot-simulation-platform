package com.michalbykowy.iotsim;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@SpringBootApplication
public class IotsimApplication {

	public static void main(String[] args) {
		SpringApplication.run(IotsimApplication.class, args);
	}

	@Bean
	public TaskScheduler taskScheduler() {
		ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
		scheduler.setPoolSize(5);
		scheduler.setThreadNamePrefix("sim-scheduler-");
		return scheduler;
	}
}