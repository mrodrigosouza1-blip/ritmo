require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'RitmoWidgetBridge'
  s.version        = package['version']
  s.summary        = 'Bridge para Ritmo Widget (App Group + WidgetCenter)'
  s.description    = 'Expõe getAppGroupPath e reloadWidgets para o widget nativo'
  s.license        = 'MIT'
  s.author         = 'Ritmo'
  s.homepage       = 'https://github.com/ritmo/ritmo'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
end
