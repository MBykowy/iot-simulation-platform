package com.michalbykowy.iotsim.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.*;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_FIELD_INJECTION;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

@AnalyzeClasses(packages = "com.michalbykowy.iotsim", importOptions = ImportOption.DoNotIncludeTests.class)
public class ArchitectureTest {

    @ArchTest
    static final ArchRule controllers_should_only_access_services = classes()
            .that().resideInAPackage("..controller..")
            .should().onlyDependOnClassesThat()
            .resideInAnyPackage(
                    "..controller..",
                    "..service..",
                    "..model..",
                    "..api..",
                    "..dto..",
                    "java..",
                    "org.springframework..",
                    "com.fasterxml.jackson..",
                    "jakarta.."
            );

    @ArchTest
    static final ArchRule services_should_be_named_service = classes()
            .that().resideInAPackage("..service..")
            .and().areAnnotatedWith(org.springframework.stereotype.Service.class)
            .should().haveSimpleNameEndingWith("Service");

    @ArchTest
    static final ArchRule no_field_injection = NO_CLASSES_SHOULD_USE_FIELD_INJECTION;

    @ArchTest
    static final ArchRule no_cycles = slices()
            .matching("com.michalbykowy.iotsim.(*)..")
            .should().beFreeOfCycles();

    @ArchTest
    static final ArchRule controllers_should_not_return_entities = methods()
            .that().arePublic()
            .and().areDeclaredInClassesThat().resideInAPackage("..controller..")
            .should().notHaveRawReturnType(
                    resideInAPackage("..model..")
            )
            .because("Controllers must return DTO");
}