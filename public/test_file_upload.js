var app = angular.module('fileUpload', ['ngFileUpload']);

app.controller('MyCtrl', ['$scope', 'Upload', function ($scope, Upload) {
    $scope.imageUrl = false;
    $scope.isLoading = false;

    // Upload on file select
    $scope.upload = function (file) {
        console.log("Inside photo uploader");
        Upload.upload({
            url: 'http://localhost:3000/photos', //where would this be? route to server
            method: 'POST',
            data: { file: file }
        }).then(function (resp) {
            console.log('Success uploaded. Response: ', resp);
            console.log('ImageURL is ', resp.data.imageUrl);
            //Need to add characters at the end or Angular doesn't know it's a new link
            $scope.isLoading = false;
            $scope.imageUrl = resp.data.imageUrl + '?' + new Date().getTime();
        }, function (resp) {
            console.log('Error status: ' + resp.status);
        }, function (evt) {
            $scope.isLoading = true;
            console.log('downloading');
            var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
            console.log('progress: ' + progressPercentage + '% ');
        }
        );
    };
}]);