'use strict';

/**
 */
angular.module('openolitor')
  .controller('LieferungenListController', ['$scope', '$routeParams',
    '$location', '$uibModal', '$log', 'gettext', 'ngTableParams', 'msgBus',
    'LieferungenListModel', 'LIEFERSTATUS', 'LIEFERRHYTHMEN',

    function($scope, $routeParams, $location, $uibModal, $log, gettext,
      ngTableParams,
      msgBus, LieferungenListModel, LIEFERSTATUS, LIEFERRHYTHMEN) {

      $scope.now = new Date();
      $scope.template = {
        creating: 0
      };
      $scope.deletingLieferung = {};
      $scope.status = {
        open: false
      };
      $scope.lieferungen = undefined;

      $scope.hasLieferungen = function() {
        return $scope.lieferungen !== undefined;
      };

      $scope.addLieferung = function() {
        if ($scope.datumExistiert($scope.template.datum)) {
          return;
        }
        var newModel = new LieferungenListModel({
          datum: $scope.template.datum,
          abotypId: parseInt($routeParams.id),
          vertriebsartId: $scope.selectedVertriebsart.id
        });
        newModel.$save();
        $scope.template.creating = $scope.template.creating + 1;
        $scope.template.datum = undefined;
        $scope.status.open = false;
      };

      $scope.datumExistiert = function(datum) {
        //first check if date if not yet part of the list of lieferdat. Lieferdat must be unique
        var result = false;
        angular.forEach($scope.lieferungen, function(lieferung) {
          if (lieferung.datum.toDateString() === datum.toDateString()) {
            result = true;
            return;
          }
        });
        return result;
      };

      $scope.deletingLieferung = function(lieferung) {
        return $scope.deletingLieferung[lieferung.id];
      };

      $scope.deleteLieferung = function(lieferung) {
        $scope.deletingLieferung[lieferung.id] = true;
        lieferung.$delete();
      };

      if (!$scope.lieferungenTableParams) {
        //use default tableParams
        $scope.lieferungenTableParams = new ngTableParams({ // jshint ignore:line
          counts: [],
          sorting: {
            datum: 'asc'
          }
        }, {
          getData: function($defer, params) {
            if (!$scope.lieferungen) {
              return;
            }
            params.total($scope.lieferungen.length);
            $defer.resolve($scope.lieferungen);
          }

        });
      }


      $scope.generateLieferungen = function(lieferdaten) {
        angular.forEach(lieferdaten, function(lieferdat) {
          var newModel = new LieferungenListModel({
            datum: lieferdat,
            abotypId: parseInt($routeParams.id),
            vertriebsartId: $scope.selectedVertriebsart.id
          });
          newModel.$save();
          $scope.template.creating = $scope.template.creating + 1;
        });
      };

      $scope.canGenerateLieferungen = function() {
        return ($scope.abotyp.lieferrhythmus === LIEFERRHYTHMEN.WOECHENTLICH ||
          $scope.abotyp.lieferrhythmus === LIEFERRHYTHMEN.ZWEIWOECHENTLICH
        ) && !$scope.showLoading();
      };

      $scope.showLoading = function() {
        return $scope.loading || $scope.template.creating > 0;
      };

      $scope.showGenerateLieferungenDialog = function() {
        var modalInstance = $uibModal.open({
          animation: true,
          templateUrl: 'scripts/abotypen/detail/lieferungen/generate-lieferungen.html',
          controller: 'GenerateLieferungenController',
          resolve: {
            von: function() {
              if (!$scope.lieferungen || $scope.lieferungen.length ===
                0) {
                return new Date();
              } else {
                return $scope.lieferungen[$scope.lieferungen.length -
                  1].datum;
              }
            },
            abotyp: function() {
              return $scope.abotyp;
            },
            vertriebsart: function() {
              return $scope.selectedVertriebsart;
            }
          }
        });

        modalInstance.result.then(function(lieferungen) {
          $scope.generateLieferungen(lieferungen);
        }, function() {
          $log.info('Modal dismissed at: ' + new Date());
        });
      };

      function load() {
        if ($scope.loading) {
          return;
        }

        $scope.loading = true;
        $scope.lieferungen = LieferungenListModel.query({
          abotypId: parseInt($routeParams.id),
          vertriebsartId: $scope.selectedVertriebsart.id
        }, function() {
          $scope.lieferungenTableParams.reload();
          $scope.loading = false;
        });
      }

      load();

      msgBus.onMsg('VertriebsartSelected', $scope, function(event, msg) {
        $scope.selectedVertriebsart = msg.vertriebsart;
        if ($scope.selectedVertriebsart) {
          load();
        }
      });

      msgBus.onMsg('AbotypLoaded', $scope, function(event, msg) {
        $scope.abotyp = msg.abotyp;
      });

      msgBus.onMsg('EntityCreated', $scope, function(event, msg) {
        if (msg.entity === 'Lieferung') {
          $scope.template.creating = $scope.template.creating - 1;

          $scope.lieferungen.push(new LieferungenListModel(msg.data));
          $scope.lieferungenTableParams.reload();

          $scope.$apply();
        }
      });

      msgBus.onMsg('EntityDeleted', $scope, function(event, msg) {
        if (msg.entity === 'Lieferung') {
          $scope.template.deleting = undefined;
          $scope.deletingLieferung[msg.data.id] = undefined;
          angular.forEach($scope.lieferungen, function(lieferung) {
            if (lieferung.id === msg.data.id) {
              var index = $scope.lieferungen.indexOf(lieferung);
              if (index > -1) {
                $scope.lieferungen.splice(index, 1);
              }
            }
          });

          $scope.lieferungenTableParams.reload();
          $scope.$apply();
        }
      });
    }
  ]);
