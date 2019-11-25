import angular from 'angular';
    import CollapsibleTreeModule from './collapsibleTree/collapsibleTree.module';

const ComponentsModule = angular.module('app.components',[
       CollapsibleTreeModule.name 
]);

export default ComponentsModule;

  