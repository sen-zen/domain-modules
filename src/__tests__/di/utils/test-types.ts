export interface UseCase {
    class: () => unknown;
    scope: 'request';
}

export interface Repository {
    class: () => unknown;
    scope: 'singleton';
}

export interface Service {
    class: () => unknown;
    scope: 'singleton';
}
