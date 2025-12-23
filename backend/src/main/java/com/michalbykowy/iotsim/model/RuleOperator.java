package com.michalbykowy.iotsim.model;

public enum RuleOperator {
    EQUALS {
        @Override
        public boolean apply(double actual, double expected) {
            return Double.compare(actual, expected) == 0;
        }
    },
    GREATER_THAN {
        @Override
        public boolean apply(double actual, double expected) {
            return actual > expected;
        }
    },
    LESS_THAN {
        @Override
        public boolean apply(double actual, double expected) {
            return actual < expected;
        }
    },
    NOT_EQUALS {
        @Override
        public boolean apply(double actual, double expected) {
            return Double.compare(actual, expected) != 0;
        }
    };

    public abstract boolean apply(double actual, double expected);
}